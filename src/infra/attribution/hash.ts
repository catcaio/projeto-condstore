import { createHash } from 'crypto';

export function sha256Hex(input: string | null | undefined): string | null {
  if (!input) return null;
  const normalized = input.trim();
  if (!normalized) return null;
  return createHash('sha256').update(normalized).digest('hex');
}
