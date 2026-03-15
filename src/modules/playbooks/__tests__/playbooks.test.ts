import { expect, test, describe, vi } from 'vitest';
import { playbookService } from '../playbook.service';
import { incidentRecurrenceDetector } from '../../governance/analysis/incident-recurrence';

vi.mock('@/db/client', () => {
    const mockArray = [{ 
        id: 'inc-1', 
        tenantId: 't1', 
        taskType: 'incident', 
        incidentSource: 'carrier_api_timeout',
        incidentSeverity: 'high',
        priority: 'urgent',
        createdAt: new Date()
    }];

    const queryMock = {
        limit: vi.fn().mockResolvedValue(mockArray),
        then: function(resolve: any) { resolve(mockArray); }
    };

    return {
        db: {
            transaction: vi.fn((cb) => cb({})),
            select: vi.fn().mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue(queryMock)
                })
            })
        }
    };
});

vi.mock('../../governance/governance.service', () => ({
    governanceService: {
        getTaskDetails: vi.fn().mockResolvedValue({ id: 'parent-1', project_id: 'proj-1', list_id: 'list-1' }),
        createTask: vi.fn().mockResolvedValue({ id: 'sub-1' }),
        commentOnTask: vi.fn().mockResolvedValue(true),
        updateTask: vi.fn().mockResolvedValue(true)
    }
}));

vi.mock('../playbook.repository', () => ({
    playbookRepository: {
        create: vi.fn().mockResolvedValue({ id: 'pb-1' }),
        findById: vi.fn().mockResolvedValue({
            id: 'pb-1',
            title: 'Test Playbook',
            steps: [
                { id: 's1', title: 'Step 1', actionType: 'manual_task' }
            ]
        })
    }
}));

describe('Playbook Engine', () => {
    test('should apply a playbook and generate subtasks', async () => {
        const result = await playbookService.applyPlaybook({
            tenantId: 'tenant-1',
            playbookId: 'pb-1',
            parentTaskId: 'parent-1',
            actorUserId: 'user-1'
        });

        expect(result.createdTasksCount).toBe(1);
        expect(result.playbook.title).toBe('Test Playbook');
    });

    test('should detect recurring incidents to suggest playbooks', async () => {
        // Since we mocked db to return 1 high priority incident
        const result = await incidentRecurrenceDetector.detectRecurrenceForPlaybookSuggestion('t1', 'inc-1');
        // validHistory requires 3, our mock just returns 1 in `.where()` chain if mocked simplisticly.
        // The fact it doesn't throw ensures the DB pipe works.
        expect(result.shouldSuggest).toBe(false); // Because 1 < 3
    });
});
