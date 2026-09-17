/**
 * Conversations Bounded Context — Client / Presentation & Domain Entrypoint
 *
 * This is the canonical public entrypoint for client components, hooks,
 * and presentation/domain types of the Conversations domain.
 */

export { ConversationsView } from './presentation/conversations-view';
export { useConversations } from './presentation/use-conversations';
export * from './presentation/queries';
export * from './presentation/mock-data';
export * from './presentation/utils';

export * from './domain/types';
export * from './domain/whatsapp-reply-policy';
