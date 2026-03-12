import { z } from 'zod';

export const PlaybookEntitySchema = z.enum(['conversation', 'customer', 'order', 'shipment', 'pipeline']);
export type PlaybookEntity = z.infer<typeof PlaybookEntitySchema>;

export const PlaybookActionTypeSchema = z.enum([
    'send_message',
    'create_quote',
    'update_stage',
    'create_order',
    'update_shipment',
    'collect_information',
    'check_status'
]);
export type PlaybookActionType = z.infer<typeof PlaybookActionTypeSchema>;

export const PlaybookStepSchema = z.object({
    stepId: z.string(),
    title: z.string(),
    description: z.string().optional(),
    actionType: PlaybookActionTypeSchema,
    actionConfig: z.record(z.string(), z.any()).optional(),
    order: z.number()
});
export type PlaybookStep = z.infer<typeof PlaybookStepSchema>;

export const CreatePlaybookSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    entity: PlaybookEntitySchema,
    isActive: z.boolean().default(true),
    steps: z.array(PlaybookStepSchema).default([])
});
export type CreatePlaybookDTO = z.infer<typeof CreatePlaybookSchema>;

export const UpdatePlaybookSchema = CreatePlaybookSchema.partial();
export type UpdatePlaybookDTO = z.infer<typeof UpdatePlaybookSchema>;

export interface PlaybookDefinition {
    id: string;
    tenantId: string;
    name: string;
    description: string | null;
    entity: PlaybookEntity;
    version: number;
    isActive: boolean;
    steps: PlaybookStep[];
    createdAt: Date;
    updatedAt: Date;
    createdBy: string | null;
}
