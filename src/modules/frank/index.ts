/**
 * Frank Module — Client Entrypoint.
 *
 * Re-exports client-safe symbols (server actions) for UI consumers.
 * Use `@/modules/frank` to import these.
 *
 * Note: The 'use server' directive is on the source file (actions/review.ts),
 * not on this barrel, as Next.js requires server actions to be marked at source.
 */

export {
    getPendingFrankActions,
    approveAndExecuteFrankAction,
    rejectFrankAction,
} from './actions/review';
export type { ActionResponse } from './actions/review';
