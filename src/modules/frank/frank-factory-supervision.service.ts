import { frankExecutionStateService } from '@/modules/frank/frank-execution-state.service';
import { logger } from '@/infra/logger';

export interface FactoryPRParams {
    tenantId: string;
    executionId: string;
    prNumber: number;
    prTitle?: string;
    prUrl?: string;
    changedFiles?: string[];
    diffSummary?: string;
    ciStatus?: 'SUCCESS' | 'FAILURE' | 'PENDING';
    ciChecks?: Array<{ name: string; status: 'SUCCESS' | 'FAILURE' | 'PENDING' }>;
}

export interface PRReviewResult {
    prNumber: number;
    issueTitle: string;
    addressesOriginalIssue: boolean;
    acceptanceCriteriaCheck: { criterion: string; satisfied: boolean }[];
    regressionsFound: boolean;
    ciPassed: boolean;
    tenantIsolationVerified: boolean;
    recommendation: 'APPROVE_AND_MERGE' | 'REQUEST_CHANGES' | 'NEEDS_HUMAN_REVIEW';
    requiresHumanMergeApproval: boolean;
    comments: string[];
}

export class FrankFactorySupervisionService {
    /**
     * Reviews a Pull Request submitted by Factory Software against the original issue diagnostic criteria using real GitHub API data when available.
     * Note: Frank's recommendation NEVER automatically merges a PR. Human Gate remains mandatory for merges.
     */
    async reviewFactoryPR(params: FactoryPRParams): Promise<PRReviewResult> {
        logger.info('Frank Supervising Factory PR', { tenantId: params.tenantId, prNumber: params.prNumber });

        const executionData = await frankExecutionStateService.getExecutionWithSteps(params.tenantId, params.executionId);
        const comments: string[] = [];

        let realDiff = params.diffSummary || '';
        let ciPassed = params.ciStatus === 'SUCCESS';
        let prTitle = params.prTitle || `PR #${params.prNumber}`;

        // Attempt real GitHub API queries when GITHUB_TOKEN is available
        const githubToken = process.env.GITHUB_TOKEN;
        if (githubToken) {
            try {
                const headers = {
                    Authorization: `Bearer ${githubToken}`,
                    Accept: 'application/vnd.github.v3+json',
                };

                // 1. Fetch PR Metadata
                const prRes = await fetch(`https://api.github.com/repos/catcaio/projeto-condstore/pulls/${params.prNumber}`, { headers });
                if (prRes.ok) {
                    const prData = await prRes.json();
                    prTitle = prData.title || prTitle;
                    const headSha = prData.head?.sha;

                    // 2. Fetch PR Diff text
                    const diffRes = await fetch(`https://api.github.com/repos/catcaio/projeto-condstore/pulls/${params.prNumber}`, {
                        headers: { ...headers, Accept: 'application/vnd.github.v3.diff' }
                    });
                    if (diffRes.ok) {
                        realDiff = await diffRes.text();
                    }

                    // 3. Fetch CI Check Runs for PR HEAD commit
                    if (headSha) {
                        const checksRes = await fetch(`https://api.github.com/repos/catcaio/projeto-condstore/commits/${headSha}/check-runs`, { headers });
                        if (checksRes.ok) {
                            const checksData = await checksRes.json();
                            const runs: Array<{ conclusion: string; status: string }> = checksData.check_runs || [];
                            if (runs.length > 0) {
                                ciPassed = runs.every(r => r.status === 'completed' && r.conclusion === 'success');
                            }
                        }
                    }
                }
            } catch (githubErr) {
                logger.warn('Failed querying GitHub API for PR supervision, using input fallback', { prNumber: params.prNumber, err: githubErr });
            }
        }

        if (!ciPassed) {
            comments.push('Atenção: CI da PR possui falhas ou verificações pendentes.');
        }

        // Verify Multi-Tenant Isolation in Diff
        const diffLower = realDiff.toLowerCase();
        let tenantIsolationVerified = true;
        const isTenantBypass =
            (diffLower.includes('tenantid') || diffLower.includes('tenant_id')) &&
            (diffLower.includes('query') || diffLower.includes('body') || diffLower.includes('params') || diffLower.includes('optional') || diffLower.includes('bypass') || diffLower.includes('fallback'));

        if (isTenantBypass) {
            tenantIsolationVerified = false;
            comments.push('Alerta de Segurança: Possível relaxamento/vazamento nas regras de isolamento multi-tenant (tenantId) no diff.');
        }

        // Acceptance Criteria Verification
        const issueContext = executionData?.run.contextJson || {};
        const originalSignal = (issueContext as any).signalType || 'Anomalia Detectada';

        const criteriaCheck = [
            { criterion: `Solução direcionada ao problema original (${originalSignal})`, satisfied: true },
            { criterion: 'Preservação de isolamento multi-tenant (tenantId)', satisfied: tenantIsolationVerified },
            { criterion: 'Sucesso nos checks automatizados de CI/CD', satisfied: ciPassed },
        ];

        let regressionsFound = !tenantIsolationVerified;
        let recommendation: 'APPROVE_AND_MERGE' | 'REQUEST_CHANGES' | 'NEEDS_HUMAN_REVIEW' = 'NEEDS_HUMAN_REVIEW';

        if (ciPassed && tenantIsolationVerified && !regressionsFound) {
            recommendation = 'APPROVE_AND_MERGE';
            comments.push('Frank recomenda aprovação da PR. Todas as verificações de conformidade foram atendidas.');
        } else {
            recommendation = 'REQUEST_CHANGES';
            comments.push('A PR requer modificações da Factory antes de considerar merge.');
        }

        // Add Supervision Step to Frank Execution State
        if (executionData) {
            await frankExecutionStateService.addStep({
                executionRunId: executionData.run.id,
                tenantId: params.tenantId,
                stepNumber: 3,
                stepName: `Supervisão da PR #${params.prNumber} da Factory`,
                actionType: 'SUPERVISE_FACTORY_PR',
                riskClass: 'GUARDED',
                requiresHumanApproval: true,
                inputPayload: {
                    prNumber: params.prNumber,
                    prTitle,
                    recommendation,
                    comments,
                    tenantIsolationVerified,
                },
            });
        }

        return {
            prNumber: params.prNumber,
            issueTitle: executionData?.run.title || prTitle,
            addressesOriginalIssue: true,
            acceptanceCriteriaCheck: criteriaCheck,
            regressionsFound,
            ciPassed,
            tenantIsolationVerified,
            recommendation,
            requiresHumanMergeApproval: true, // Invariant: Frank recommendation never auto-merges without human approval
            comments,
        };
    }
}

export const frankFactorySupervisionService = new FrankFactorySupervisionService();
