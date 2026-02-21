// Interface proxy pointing to the TiDB implementation
export * from '../stores/userStore.tidb';

// Optionally define specifically what gets exported here or interface types
// But exporting * achieves the 'keep exact same store interface' requirement.
export interface User {
    id: string;
    email: string;
    passwordHash: string;
    createdAt: number;
}
