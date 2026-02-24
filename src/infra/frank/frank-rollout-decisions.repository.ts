import { frankRolloutDecisions } from '@/drizzle/schema';
import { getDb } from '@/infra/db';

type DecisionInsertParams = {
  tenantId: string;
  baseline: string;
  candidate: string;
  decision: 'PASS' | 'FAIL' | 'INSUFFICIENT_DATA';
  applied: boolean;
  dryRun: boolean;
  reasonsJson: unknown;
  metricsJson: unknown;
  requestId: string;
};

export async function insertDecision(params: DecisionInsertParams): Promise<string>;
export async function insertDecision(db: Awaited<ReturnType<typeof getDb>>, params: DecisionInsertParams): Promise<string>;
export async function insertDecision(
  arg1: Awaited<ReturnType<typeof getDb>> | DecisionInsertParams,
  arg2?: DecisionInsertParams,
): Promise<string> {
  const id = crypto.randomUUID();
  const db = arg2 ? (arg1 as Awaited<ReturnType<typeof getDb>>) : await getDb();
  const params = arg2 ?? (arg1 as DecisionInsertParams);

  await db.insert(frankRolloutDecisions).values({
    id,
    tenantId: params.tenantId,
    baseline: params.baseline,
    candidate: params.candidate,
    decision: params.decision,
    applied: params.applied ? 1 : 0,
    dryRun: params.dryRun ? 1 : 0,
    reasonsJson: params.reasonsJson,
    metricsJson: params.metricsJson,
    requestId: params.requestId,
  });

  return id;
}
