export type PlaybookDraft = {
    title: string;
    description: string;
    steps: Array<{
        title: string;
        description?: string;
        actionType: 'manual_task' | 'investigation' | 'communication' | 'escalation';
    }>;
    recommendedActions: string[];
};

export async function suggestPlaybook(
    tenantId: string,
    context: {
        incidentHistory: Array<{ title: string; severity?: string; status: string; createdAt: Date }>;
        source: string;
        relatedEvents?: any[];
    }
): Promise<PlaybookDraft | null> {
    console.warn('[Frank Tool] suggestPlaybook => AI Provider not available in this environment. Returning null.');
    return null;
}
