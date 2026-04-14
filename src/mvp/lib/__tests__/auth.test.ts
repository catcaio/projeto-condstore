import { describe, expect, it } from 'vitest';
import { getMvpSessionFromHeaders } from '../auth';

describe('getMvpSessionFromHeaders', () => {
  it('returns null when all auth headers are absent', () => {
    const headers = new Headers();
    expect(getMvpSessionFromHeaders(headers)).toBeNull();
  });

  it('returns a session object when all required headers are present', () => {
    const headers = new Headers({
      'x-auth-user-id': 'user-123',
      'x-auth-tenant-id': 'tenant-456',
      'x-auth-role': 'admin',
    });
    expect(getMvpSessionFromHeaders(headers)).toEqual({
      userId: 'user-123',
      tenantId: 'tenant-456',
      role: 'admin',
    });
  });

  it('returns null when x-auth-role is missing', () => {
    const headers = new Headers({
      'x-auth-user-id': 'user-123',
      'x-auth-tenant-id': 'tenant-456',
    });
    expect(getMvpSessionFromHeaders(headers)).toBeNull();
  });

  it('returns null when x-auth-tenant-id is missing', () => {
    const headers = new Headers({
      'x-auth-user-id': 'user-123',
      'x-auth-role': 'member',
    });
    expect(getMvpSessionFromHeaders(headers)).toBeNull();
  });

  it('returns null when x-auth-user-id is missing', () => {
    const headers = new Headers({
      'x-auth-tenant-id': 'tenant-456',
      'x-auth-role': 'member',
    });
    expect(getMvpSessionFromHeaders(headers)).toBeNull();
  });
});
