import { FrankDagPlanInput, FrankDagTaskInput, FrankDagPlan, FrankDagTask, TaskPredecessorFailurePolicy } from './frank-dag.types';

export class FrankDagValidationError extends Error {
    public readonly code: string;

    constructor(code: string, message: string) {
        super(`[FrankDagValidationError:${code}] ${message}`);
        this.name = 'FrankDagValidationError';
        this.code = code;
    }
}

export class FrankDagValidator {
    /**
     * Validates raw plan input and converts it into a validated, normalized FrankDagPlan structure.
     * Fails closed on any structural anomaly, cycle, or tenant/execution context mismatch.
     */
    public static validateAndNormalizePlan(input: FrankDagPlanInput): FrankDagPlan {
        const { tenantId, tasks, dagId, version, title, executionRunId, predecessorFailurePolicy } = input;

        // 1. Validate tenantId
        if (!tenantId || typeof tenantId !== 'string' || tenantId.trim().length === 0) {
            throw new FrankDagValidationError(
                'INVALID_TENANT_ID',
                'DAG plan rejection: trusted tenantId is required.'
            );
        }

        const normalizedTenantId = tenantId.trim();

        // 2. Validate empty DAG
        if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
            throw new FrankDagValidationError(
                'EMPTY_DAG',
                `DAG plan rejection: plan for tenant [${normalizedTenantId}] contains no tasks.`
            );
        }

        const taskMap = new Map<string, FrankDagTask>();
        const seenTaskIds = new Set<string>();

        // 3. Validate task IDs, tenant consistency, and context
        for (let i = 0; i < tasks.length; i++) {
            const rawTask = tasks[i];

            if (!rawTask || typeof rawTask !== 'object') {
                throw new FrankDagValidationError(
                    'INVALID_TASK_STRUCTURE',
                    `DAG task at index [${i}] is not a valid task object.`
                );
            }

            const { taskId, toolName, input: taskInput } = rawTask;

            if (!taskId || typeof taskId !== 'string' || taskId.trim().length === 0) {
                throw new FrankDagValidationError(
                    'MISSING_TASK_ID',
                    `DAG task at index [${i}] lacks a valid taskId.`
                );
            }

            const normalizedTaskId = taskId.trim();

            // Check for duplicate task IDs
            if (seenTaskIds.has(normalizedTaskId)) {
                throw new FrankDagValidationError(
                    'DUPLICATE_TASK_ID',
                    `Duplicate taskId [${normalizedTaskId}] detected in DAG plan.`
                );
            }
            seenTaskIds.add(normalizedTaskId);

            // Check task tenant isolation if supplied
            if (rawTask.tenantId && rawTask.tenantId.trim() !== normalizedTenantId) {
                throw new FrankDagValidationError(
                    'CROSS_TENANT_TASK_REJECTED',
                    `Task [${normalizedTaskId}] specifies tenantId [${rawTask.tenantId}], which violates DAG plan tenantId [${normalizedTenantId}].`
                );
            }

            // Check task executionRunId isolation if supplied
            if (
                executionRunId &&
                rawTask.executionRunId &&
                rawTask.executionRunId.trim() !== executionRunId.trim()
            ) {
                throw new FrankDagValidationError(
                    'CROSS_EXECUTION_TASK_REJECTED',
                    `Task [${normalizedTaskId}] specifies executionRunId [${rawTask.executionRunId}], which violates DAG plan executionRunId [${executionRunId}].`
                );
            }

            if (!toolName || typeof toolName !== 'string' || toolName.trim().length === 0) {
                throw new FrankDagValidationError(
                    'MISSING_TOOL_NAME',
                    `Task [${normalizedTaskId}] lacks a valid toolName.`
                );
            }

            const dependencies = Array.isArray(rawTask.dependencies)
                ? Array.from(new Set(rawTask.dependencies.map(d => d.trim())))
                : [];

            // Check self dependency
            if (dependencies.includes(normalizedTaskId)) {
                throw new FrankDagValidationError(
                    'SELF_DEPENDENCY',
                    `Task [${normalizedTaskId}] cannot depend on itself.`
                );
            }

            const normalizedTask: FrankDagTask = {
                taskId: normalizedTaskId,
                tenantId: normalizedTenantId,
                title: rawTask.title || `Task: ${toolName}`,
                toolName: toolName.trim(),
                input: taskInput ?? {},
                dependencies,
                status: 'BLOCKED', // All tasks start BLOCKED until dependency resolution tick
                priority: rawTask.priority || 'MEDIUM',
                executionParams: rawTask.executionParams,
                executionRunId: rawTask.executionRunId || executionRunId,
                executionStepId: rawTask.executionStepId,
            };

            taskMap.set(normalizedTaskId, normalizedTask);
        }

        // 4. Validate existence of all dependencies
        for (const [taskId, task] of taskMap.entries()) {
            for (const depId of task.dependencies) {
                if (!taskMap.has(depId)) {
                    throw new FrankDagValidationError(
                        'NONEXISTENT_DEPENDENCY',
                        `Task [${taskId}] depends on nonexistent task [${depId}].`
                    );
                }
            }
        }

        // 5. Detect topological cycles using Kahn's algorithm (deterministic)
        FrankDagValidator.detectCycles(taskMap);

        const now = new Date().toISOString();
        const finalDagId = dagId && dagId.trim().length > 0
            ? dagId.trim()
            : `dag_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        const finalPolicy: TaskPredecessorFailurePolicy = predecessorFailurePolicy || 'SKIP_SUCCESSORS';

        const plan: FrankDagPlan = {
            dagId: finalDagId,
            version: typeof version === 'number' && version > 0 ? version : 1,
            tenantId: normalizedTenantId,
            title: title || `DAG Plan ${finalDagId}`,
            executionRunId: executionRunId?.trim(),
            status: 'PENDING',
            predecessorFailurePolicy: finalPolicy,
            tasks: taskMap,
            createdAt: now,
            updatedAt: now,
        };

        return plan;
    }

    /**
     * Deterministic Cycle Detection using In-Degree / Kahn's algorithm.
     * Sorted deterministically to guarantee reproducible error messages.
     */
    public static detectCycles(taskMap: Map<string, FrankDagTask>): void {
        const inDegree = new Map<string, number>();
        const adjacency = new Map<string, string[]>();

        const sortedTaskIds = Array.from(taskMap.keys()).sort();

        for (const taskId of sortedTaskIds) {
            inDegree.set(taskId, 0);
            adjacency.set(taskId, []);
        }

        for (const taskId of sortedTaskIds) {
            const task = taskMap.get(taskId)!;
            inDegree.set(taskId, task.dependencies.length);
            for (const depId of task.dependencies) {
                adjacency.get(depId)!.push(taskId);
            }
        }

        // Sort adjacency lists for deterministic order
        for (const depId of sortedTaskIds) {
            adjacency.get(depId)!.sort();
        }

        const queue: string[] = [];
        for (const taskId of sortedTaskIds) {
            if (inDegree.get(taskId) === 0) {
                queue.push(taskId);
            }
        }

        let processedCount = 0;

        while (queue.length > 0) {
            const curr = queue.shift()!;
            processedCount++;

            const successors = adjacency.get(curr) || [];
            for (const successor of successors) {
                const currentDegree = inDegree.get(successor)! - 1;
                inDegree.set(successor, currentDegree);
                if (currentDegree === 0) {
                    queue.push(successor);
                }
            }
        }

        if (processedCount < taskMap.size) {
            // Unprocessed nodes are part of a cycle
            const cycleNodeIds = sortedTaskIds.filter(id => (inDegree.get(id) || 0) > 0);
            throw new FrankDagValidationError(
                'CYCLE_DETECTED',
                `Dependency cycle detected in DAG involving tasks: [${cycleNodeIds.join(', ')}].`
            );
        }
    }
}
