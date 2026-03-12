import { z } from 'zod';

export const LinkPlaybookDTOSchema = z.object({
    playbookId: z.string().uuid(),
});
export type LinkPlaybookDTO = z.infer<typeof LinkPlaybookDTOSchema>;

export const CreatePlaybookFromIntentDTOSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    intent: z.string().min(1).max(100),
    triggerPhrases: z.array(z.string().max(300)).max(50).default([]),
    relatedEntities: z.array(z.string().max(50)).max(20).default([]),
    responseBase: z.string().min(1).max(2000),
    responseShort: z.string().max(500).optional(),
    nextStepSuggestion: z.string().max(500).optional(),
    requiresConfirmation: z.boolean().default(false),
    requiresHumanHandoff: z.boolean().default(false),
    handoffConditions: z.string().max(1000).optional(),
    tags: z.array(z.string().max(50)).max(20).default([]),
    priority: z.number().default(0),
    status: z.enum(['draft', 'approved', 'archived']).default('draft'),
});
export type CreatePlaybookFromIntentDTO = z.infer<typeof CreatePlaybookFromIntentDTOSchema>;
