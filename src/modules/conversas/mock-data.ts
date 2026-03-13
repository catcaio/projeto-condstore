/**
 * Backward-compatible re-exports from the canonical types file.
 * All mock seed data has been removed — the inbox now uses the real API.
 */
export type {
    ConversationActor,
    ConversationChannel,
    ConversationContextData,
    ConversationMessage,
    ConversationOrder,
    ConversationPriority,
    ConversationRecord,
    ConversationSimulation,
    ConversationStatus,
} from './types';
