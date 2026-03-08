/**
 * Freight Simulate — Public API (session-protected).
 *
 * Re-exports the internal freight simulate handler at a non-internal path
 * so the cockpit UI can call it directly with an admin session cookie.
 * The handler itself uses requireAdmin for auth.
 */
export const dynamic = 'force-dynamic';

export { POST } from '@/app/api/internal/freight/simulate/route';
