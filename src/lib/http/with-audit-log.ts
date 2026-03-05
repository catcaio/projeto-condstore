import { NextRequest, NextResponse } from 'next/server';
import { writeAuditLog, ActorType } from '../security/require-audit-log';
import { structuredLogger as logger } from '../../infra/log/logger';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HandlerWrapper = (req: NextRequest, ctx: any) => Promise<NextResponse>;

export interface AuditLogConfig {
    action: string;
    scope: string;
    actorType?: ActorType;
}

/**
 * Wraps a Next.js route handler with mandatory audit logging (fail-closed).
 *
 * Composition order: `withReplayProtection(withIdempotency(withAuditLog({...}, handler)))`
 *
 * 1. Extracts requestId from `x-request-id` header or generates one.
 * 2. Executes the inner handler.
 * 3. Writes an audit log with the action, scope, and response status.
 * 4. If the audit write fails → returns 503 (fail-closed), discarding the handler response.
 */
export function withAuditLog(config: AuditLogConfig, handler: HandlerWrapper): HandlerWrapper {
    return async (req: NextRequest, ctx?: any): Promise<NextResponse> => {
        const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
        const actorType = config.actorType ?? 'user';

        // Extract actor info from common patterns
        const tenantId = (ctx?.params?.tenantId as string) || null;

        // Execute the handler first
        let response: NextResponse;
        try {
            response = await handler(req, ctx);
        } catch (handlerError) {
            // Handler threw — still attempt to log the failure
            try {
                await writeAuditLog({
                    tenantId,
                    actorType,
                    action: config.action,
                    scope: config.scope,
                    requestId,
                    metadata: { status: 500, outcome: 'handler_error' },
                });
            } catch {
                // Audit also failed — log and return 503
                logger.error('audit_log_double_failure', {
                    action: config.action,
                    scope: config.scope,
                    requestId,
                });
            }
            return NextResponse.json(
                { error: 'Internal server error' },
                { status: 500 }
            );
        }

        // Write audit log (fail-closed)
        try {
            await writeAuditLog({
                tenantId,
                actorType,
                action: config.action,
                scope: config.scope,
                requestId,
                metadata: { status: response.status, outcome: response.ok ? 'success' : 'error' },
            });
        } catch (auditError) {
            logger.error('audit_log_write_failed', {
                action: config.action,
                scope: config.scope,
                requestId,
                error: auditError,
            });
            // Fail-closed: discard handler response and return 503
            return NextResponse.json(
                { error: 'Service temporarily unavailable: audit logging failed' },
                { status: 503 }
            );
        }

        return response;
    };
}
