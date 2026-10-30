import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getServerSessionUser } from '@/infra/auth/session';
import Page from '../page';

vi.mock('@/infra/auth/session', () => ({ getServerSessionUser: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); } }));
vi.mock('@/modules/executive-dashboard/pages/ExecutiveDashboardPage', () => ({ ExecutiveDashboardPage: () => null }));

describe('Executive laboratory server authorization', () => {
  beforeEach(() => vi.resetAllMocks());
  it('redirects unauthenticated callers before rendering', async () => {
    vi.mocked(getServerSessionUser).mockResolvedValue(null);
    await expect(Page()).rejects.toThrow('REDIRECT:/login');
  });
  it.each(['manager', 'operator', 'viewer', 'unknown'])('blocks role %s on the server', async (role) => {
    vi.mocked(getServerSessionUser).mockResolvedValue({ tenantId: 'synthetic-a', sub: 'synthetic-user', role, email: 'test@example.invalid', sv: 0 });
    await expect(Page()).rejects.toThrow('REDIRECT:/cockpit/gestao-ecommerce');
  });
  it('passes only the authenticated admin tenant and user into local storage scope', async () => {
    vi.mocked(getServerSessionUser).mockResolvedValue({ tenantId: 'synthetic-a', sub: 'synthetic-user', role: 'admin', email: 'test@example.invalid', sv: 0 });
    const element = await Page();
    expect(element.props.scope).toEqual({ tenantId: 'synthetic-a', userId: 'synthetic-user' });
  });
});
