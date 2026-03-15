import { PlaybookRecord, PlaybookStepRecord } from '@/drizzle/schema';

export type PlaybookWithSteps = PlaybookRecord & {
    steps: PlaybookStepRecord[];
};

export type CreatePlaybookDTO = {
    tenantId: string;
    title: string;
    description?: string;
    triggerType?: string;
    sourceTaskType?: string;
    createdBy?: string;
    steps: Array<{
        title: string;
        description?: string;
        actionType: string;
        actionConfig?: any;
    }>;
};

export type ApplyPlaybookDTO = {
    tenantId: string;
    playbookId: string;
    parentTaskId: string;
    actorUserId: string;
};
