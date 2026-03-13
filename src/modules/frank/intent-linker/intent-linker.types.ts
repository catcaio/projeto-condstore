import { z } from 'zod';

export const LinkPlaybookDTOSchema = z.object({
    playbookId: z.string().uuid(),
});
export type LinkPlaybookDTO = z.infer<typeof LinkPlaybookDTOSchema>;

export const CreatePlaybookFromIntentDTOSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    intent: z.string().min(1),
    triggerPhrases: z.array(z.string()).default([]),
    relatedEntities: z.array(z.string()).default([]),
    responseBase: z.string().min(1),
    responseShort: z.string().optional(),
    nextStepSuggestion: z.string().optional(),
    requiresConfirmation: z.boolean().default(false),
    requiresHumanHandoff: z.boolean().default(false),
    handoffConditions: z.string().optional(),
    tags: z.array(z.string()).default([]),
    priority: z.number().default(0),
    status: z.enum(['draft', 'approved', 'archived']).default('draft'),
});
export type CreatePlaybookFromIntentDTO = z.infer<typeof CreatePlaybookFromIntentDTOSchema>;
