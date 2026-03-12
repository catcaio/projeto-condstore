import { z } from 'zod';
import { TenantConfigurationRecord } from '@/drizzle/schema';

export type ConfigCategory = 'pipeline' | 'transportadoras' | 'frete' | 'playbooks' | 'templates' | 'operacao' | 'sla';

export interface SetConfigInput<T = any> {
    tenantId: string;
    key: string;
    value: T;
    category: ConfigCategory;
    createdBy?: string; // admin/operator user id
}

export type GetConfigOutput<T = any> = {
    id: string;
    key: string;
    value: T;
    category: ConfigCategory;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string | null;
};

export const setConfigSchema = z.object({
    key: z.string().min(1).max(100),
    value: z.any(),
    category: z.enum(['pipeline', 'transportadoras', 'frete', 'playbooks', 'templates', 'operacao', 'sla']),
});

export type SetConfigDto = z.infer<typeof setConfigSchema>;
