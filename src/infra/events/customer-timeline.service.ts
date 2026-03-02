import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { customerTimelineRepository } from '@/infra/repositories/customer-timeline.repository';
import { CustomerTimelineStatus, ALL_STATUSES } from '@/domain/status/status-dictionary';
import { InfrastructureError } from '@/infra/errors';
import { requireOrganizationAccess, CustomerAuthSession } from '@/infra/security/customer-guards';
import { ErrorCode } from '@/infra/errors';

export const CustomerTimelineEventSchema = z.object({
    organizationId: z.string().min(1, 'organizationId obrigatório'),
    entityType: z.enum(['QUOTE', 'ORDER', 'SHIPMENT', 'INVOICE', 'SUPPORT']),
    entityId: z.string().min(1, 'entityId obrigatório'),
    status: z.enum(ALL_STATUSES as [string, ...string[]]),
    messagePublic: z.string().min(1, 'messagePublic obrigatória'),
    metadataJson: z.record(z.string(), z.any()).optional(),
});

export type PublishCustomerTimelinePayload = z.infer<typeof CustomerTimelineEventSchema>;

export interface AuthContext {
    tenantId: string | null;
    userId?: string;
    role?: string;
}

export class CustomerTimelineService {

    private redactSensitiveData(metadata?: Record<string, any>) {
        if (!metadata) return null;

        const redacted = { ...metadata };
        const sensitiveKeys = ['cpf', 'cnpj', 'document', 'password', 'token', 'secret', 'phone', 'email'];

        const redactRecursive = (obj: any) => {
            if (typeof obj !== 'object' || obj === null) return;
            for (const key of Object.keys(obj)) {
                if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
                    obj[key] = '[REDACTED]';
                } else if (typeof obj[key] === 'object') {
                    redactRecursive(obj[key]);
                }
            }
        };

        redactRecursive(redacted);
        return redacted;
    }

    async publishCustomerTimelineEvent(ctx: AuthContext, payload: PublishCustomerTimelinePayload) {
        if (!ctx.tenantId || !ctx.userId) {
            throw new InfrastructureError(ErrorCode.UNAUTHORIZED, 'Tenant ID and User ID are required to publish customer timeline events', { isRetryable: false });
        }

        // Validate organization access
        await requireOrganizationAccess(ctx as CustomerAuthSession, payload.organizationId);

        const validation = CustomerTimelineEventSchema.safeParse(payload);
        if (!validation.success) {
            throw new InfrastructureError(ErrorCode.VALIDATION_ERROR, 'Invalid timeline event payload', {
                isRetryable: false,
                context: { errors: validation.error.issues }
            });
        }

        const data = validation.data;
        const metadataJson = this.redactSensitiveData(data.metadataJson ?? undefined);

        const record = await customerTimelineRepository.create({
            id: randomUUID(),
            tenantId: ctx.tenantId,
            organizationId: data.organizationId,
            entityType: data.entityType,
            entityId: data.entityId,
            status: data.status,
            messagePublic: data.messagePublic,
            metadataJson: metadataJson ?? null,
        });

        // Opcional: também publicar no domine_events futuramente (NÃO agora)
        return record;
    }
}

export const customerTimelineService = new CustomerTimelineService();
