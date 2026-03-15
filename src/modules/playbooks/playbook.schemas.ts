import { z } from 'zod';

export const PlaybookStepSchema = z.object({
    title: z.string().min(1, 'Title is required').max(255),
    description: z.string().optional(),
    actionType: z.string().default('manual_task'),
    actionConfig: z.any().optional(),
});

export const CreatePlaybookSchema = z.object({
    title: z.string().min(1, 'Title is required').max(255),
    description: z.string().optional(),
    triggerType: z.string().optional(),
    sourceTaskType: z.string().optional(),
    steps: z.array(PlaybookStepSchema).min(1, 'A playbook must have at least one step'),
});

export const ApplyPlaybookSchema = z.object({
    playbookId: z.string().uuid(),
    parentTaskId: z.string().uuid(),
});
