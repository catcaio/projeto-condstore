export type Role = 'admin' | 'operator';

export function isRole(x: unknown): x is Role {
  return x === 'admin' || x === 'operator';
}
