export type Role = 'admin' | 'operator' | 'manager' | 'viewer';

export function isRole(x: unknown): x is Role {
  return x === 'admin' || x === 'operator' || x === 'manager' || x === 'viewer';
}
