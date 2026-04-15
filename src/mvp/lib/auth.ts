/**
 * Minimal auth helpers for the MVP environment.
 *
 * Reads session claims injected by the Edge middleware into request headers.
 * Does NOT import any heavy auth module — stays isolated from the main system.
 */

export interface MvpSession {
  userId: string;
  tenantId: string;
  role: string;
}

/**
 * Returns the authenticated session extracted from middleware-injected headers,
 * or null when the request is unauthenticated.
 *
 * Headers are set by src/middleware.ts only for routes inside its matcher config.
 * The /mvp route is intentionally outside that matcher, so this helper is meant
 * for sub-routes that opt-in to the middleware (e.g. /mvp/app under a future
 * matcher extension).
 */
export function getMvpSessionFromHeaders(headers: Headers): MvpSession | null {
  const userId = headers.get('x-auth-user-id');
  const tenantId = headers.get('x-auth-tenant-id');
  const role = headers.get('x-auth-role');

  if (!userId || !tenantId || !role) return null;

  return { userId, tenantId, role };
}
