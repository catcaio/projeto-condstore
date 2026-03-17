export function finopsCacheKey(tenantId: string): string {
    return `cockpit:finops:${tenantId}`;
}
