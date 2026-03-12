import { z } from 'zod';

export type CustomFieldEntity = 'customer' | 'conversation' | 'order' | 'shipment' | 'pipeline';
export type CustomFieldType = 'text' | 'number' | 'select' | 'boolean' | 'date' | 'textarea';

export const customFieldEntitySchema = z.enum(['customer', 'conversation', 'order', 'shipment', 'pipeline']);
export const customFieldTypeSchema = z.enum(['text', 'number', 'select', 'boolean', 'date', 'textarea']);

export const createCustomFieldSchema = z.object({
    entity: customFieldEntitySchema,
    fieldKey: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/, 'Only lowercase letters, numbers, and underscores'),
    label: z.string().min(1).max(255),
    type: customFieldTypeSchema,
    required: z.boolean().default(false),
    options: z.array(z.string()).optional(),
});

export type CreateCustomFieldDto = z.infer<typeof createCustomFieldSchema>;

export const updateCustomFieldSchema = z.object({
    label: z.string().min(1).max(255).optional(),
    required: z.boolean().optional(),
    options: z.array(z.string()).optional(),
});

export type UpdateCustomFieldDto = z.infer<typeof updateCustomFieldSchema>;

export interface CustomFieldDefinition {
    id: string;
    tenantId: string;
    entity: CustomFieldEntity;
    fieldKey: string;
    label: string;
    type: CustomFieldType;
    required: boolean;
    options: string[] | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface CustomFieldValue {
    fieldKey: string;
    value: string | null;
}
