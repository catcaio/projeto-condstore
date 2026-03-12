import { z } from 'zod';
import { type FrankIntentTrainingRecord, type NewFrankIntentTrainingRecord } from '@/drizzle/schema';

export const IntentTrainingStatusSchema = z.enum(['captured', 'validated', 'ignored']);
export type IntentTrainingStatus = z.infer<typeof IntentTrainingStatusSchema>;

export const CreateIntentTrainingDTOSchema = z.object({
    conversationId: z.string().optional(),
    messageId: z.string().optional(),
    messageText: z.string(),
    detectedIntent: z.string().optional(),
    entities: z.any().optional(),
    confidence: z.number().optional()
});

export type CreateIntentTrainingDTO = z.infer<typeof CreateIntentTrainingDTOSchema>;

export interface FrankIntentTraining extends FrankIntentTrainingRecord {}
