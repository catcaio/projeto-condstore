import { z } from 'zod';

export const SuggestionStatusSchema = z.enum(['generated', 'approved', 'edited', 'rejected']);
export type SuggestionStatus = z.infer<typeof SuggestionStatusSchema>;

export const FrankSuggestionSchema = z.object({
    id: z.string().uuid(),
    tenantId: z.string(),
    conversationId: z.string(),
    intent: z.string(),
    entities: z.record(z.string(), z.any()).nullable().optional(),
    playbookId: z.string().nullable().optional(),
    suggestedResponse: z.string(),
    confidence: z.number(),
    status: SuggestionStatusSchema,
    approvedBy: z.string().nullable().optional(),
    createdAt: z.date(),
    approvedAt: z.date().nullable().optional(),
});

export type FrankSuggestion = z.infer<typeof FrankSuggestionSchema>;

export const CreateSuggestionDTOSchema = z.object({
    conversationId: z.string(),
    intent: z.string(),
    entities: z.record(z.string(), z.any()).optional(),
    playbookId: z.string().optional(),
    suggestedResponse: z.string(),
    confidence: z.number(),
});

export type CreateSuggestionDTO = z.infer<typeof CreateSuggestionDTOSchema>;

export const ApproveSuggestionDTOSchema = z.object({
    operatorId: z.string(),
    finalResponse: z.string().optional(), // If edited
});

export type ApproveSuggestionDTO = z.infer<typeof ApproveSuggestionDTOSchema>;
