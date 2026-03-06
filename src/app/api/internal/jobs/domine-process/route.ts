import { NextRequest, NextResponse } from 'next/server';
import { requireInternalToken } from '@/infra/auth/tenant-route-guard';
import { withIdempotency } from '@/lib/http/with-idempotency';
import { withReplayProtection } from '@/lib/http/with-replay-protection';
import { withAuditLog } from '@/lib/http/with-audit-log';
import { loop } from '@/domine/processor/domine-processor';
import { makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { structuredLogger } from '@/infra/log/logger';
import { withJsonBody } from '@/lib/http/with-json-body';
import { z } from 'zod';
import { withDistributedLock } from '@/lib/http/with-distributed-lock';
import { jobLock } from '@/lib/infra/lock-keys';

const domineProcessSchema = z.object({
    max: z.number().int().positive().optional(),
    maxDurationMs: z.number().int().positive().optional()
}).catchall(z.any());

const TENANT_ID = 'LOJACOND';

export const POST = withReplayProtection(withIdempotency(withAuditLog(
    { action: 'domine_process_job', scope: 'jobs', actorType: 'internal' },
    withDistributedLock(() => jobLock('domine-process'), 300, withJsonBody(
        { schema: domineProcessSchema },
        async (req: NextRequest, ctx: any, body: z.infer<typeof domineProcessSchema>) => {
            const requestId = makeRequestId(req);

            const tokenGuard = requireInternalToken(req, { purpose: ['jobs'] });
            if (!tokenGuard.ok) return tokenGuard.response;

            try {
                const max = Number(body.max) || 50;
                const maxDurationMs = Number(body.maxDurationMs) || 25_000;

                structuredLogger.info('domine_process_job_started', {
                    requestId,
                    tenantId: TENANT_ID,
                    max,
                    maxDurationMs,
                });

                const stats = await loop(TENANT_ID, max, maxDurationMs);

                return NextResponse.json({ ok: true, tenantId: TENANT_ID, stats });
            } catch (err: any) {
                structuredLogger.error('domine_process_job_error', {
                    requestId,
                    tenantId: TENANT_ID,
                    error: err.message,
                });
                return errorResponse(ErrorCode.UNKNOWN, 500, requestId, err.message);
            }
        })
    ))
));
