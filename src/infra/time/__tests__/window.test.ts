import { describe, expect, it } from 'vitest';
import {
  canonicalizeIanaTimeZone,
  getLocalDateKey,
  getRangeBounds,
  parseWindow,
} from '../window';

describe('infra/time/window', () => {
  it('maps events around local midnight to the correct tenant local day', () => {
    const tz = 'America/Sao_Paulo';

    // 2026-02-19 23:30:00 local (UTC-3)
    expect(getLocalDateKey(new Date('2026-02-20T02:30:00.000Z'), tz)).toBe('2026-02-19');

    // 2026-02-20 00:30:00 local (UTC-3)
    expect(getLocalDateKey(new Date('2026-02-20T03:30:00.000Z'), tz)).toBe('2026-02-20');
  });

  it('computes 7d range bounds aligned to tenant local midnight', () => {
    const tz = 'America/Sao_Paulo';
    const { startUTC, endUTC } = getRangeBounds(parseWindow('7d'), tz, new Date('2026-02-25T15:00:00.000Z'));

    expect(startUTC.toISOString()).toBe('2026-02-18T03:00:00.000Z');
    expect(endUTC.toISOString()).toBe('2026-02-25T03:00:00.000Z');
  });

  it('validates IANA timezone names', () => {
    expect(canonicalizeIanaTimeZone('America/Sao_Paulo')).toBe('America/Sao_Paulo');
    expect(canonicalizeIanaTimeZone('Invalid/Timezone')).toBeNull();
  });
});

