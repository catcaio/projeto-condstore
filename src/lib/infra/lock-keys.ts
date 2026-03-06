export function jobLock(jobName: string): string {
    return `job:${jobName}`;
}

export function tenantLock(tenantId: string, resource: string): string {
    return `tenant:${tenantId}:${resource}`;
}

export function billingLock(tenantId: string): string {
    return `billing:${tenantId}`;
}

export function reconcileLock(provider: string, resourceId: string): string {
    return `reconcile:${provider}:${resourceId}`;
}
