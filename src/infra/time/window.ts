import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

export type MetricsWindowPreset = '7d' | '30d';

export const DEFAULT_TENANT_TIMEZONE = 'America/Sao_Paulo';

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

let supportedTimeZonesCache: Set<string> | null = null;

function getSupportedTimeZonesSet(): Set<string> | null {
  if (supportedTimeZonesCache) return supportedTimeZonesCache;

  const supportedValuesOf = (Intl as typeof Intl & {
    supportedValuesOf?: (key: string) => string[];
  }).supportedValuesOf;

  if (typeof supportedValuesOf !== 'function') {
    return null;
  }

  try {
    supportedTimeZonesCache = new Set(supportedValuesOf('timeZone'));
    return supportedTimeZonesCache;
  } catch {
    return null;
  }
}

function assertValidDayKey(dayKey: string): void {
  if (!DAY_KEY_RE.test(dayKey)) {
    throw new Error('day must be YYYY-MM-DD');
  }

  const date = new Date(`${dayKey}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error('day must be YYYY-MM-DD');
  }
}

function parseDayKey(dayKey: string): [number, number, number] {
  assertValidDayKey(dayKey);
  const [year, month, day] = dayKey.split('-').map(Number);
  return [year, month, day];
}

function localMidnightUtc(dayKey: string, tz: string): Date {
  const [year, month, day] = parseDayKey(dayKey);
  const localDate = new Date(year, month - 1, day, 0, 0, 0, 0);
  return fromZonedTime(localDate, tz);
}

export function canonicalizeIanaTimeZone(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;

  try {
    const set = getSupportedTimeZonesSet();
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: raw });
    const canonical = formatter.resolvedOptions().timeZone;

    if (set && !set.has(canonical)) {
      // Some aliases resolve to a canonical name that may not appear in the set in older runtimes.
      return canonical || raw;
    }

    return canonical || raw;
  } catch {
    return null;
  }
}

export function isValidIanaTimeZone(value: string | null | undefined): boolean {
  return canonicalizeIanaTimeZone(value) !== null;
}

export function normalizeTenantTimeZone(value: string | null | undefined): string {
  return canonicalizeIanaTimeZone(value) ?? DEFAULT_TENANT_TIMEZONE;
}

export function parseWindow(value: MetricsWindowPreset | string): number {
  if (value === '7d') return 7;
  if (value === '30d') return 30;
  throw new Error('Invalid window. Use 7d or 30d.');
}

export function getLocalDateKey(dateUTC: Date, tz: string): string {
  return formatInTimeZone(dateUTC, normalizeTenantTimeZone(tz), 'yyyy-MM-dd');
}

export function shiftLocalDateKey(dayKey: string, deltaDays: number): string {
  assertValidDayKey(dayKey);
  if (!Number.isFinite(deltaDays)) {
    throw new Error('deltaDays must be finite');
  }

  const date = new Date(`${dayKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + Math.trunc(deltaDays));
  return date.toISOString().slice(0, 10);
}

export function getRangeBounds(
  windowDays: number,
  tz: string,
  anchorDate: Date = new Date(),
): { startUTC: Date; endUTC: Date } {
  if (!Number.isInteger(windowDays) || windowDays <= 0) {
    throw new Error('windowDays must be a positive integer');
  }

  const normalizedTz = normalizeTenantTimeZone(tz);
  const endLocalDay = getLocalDateKey(anchorDate, normalizedTz);
  const startLocalDay = shiftLocalDateKey(endLocalDay, -windowDays);

  return {
    startUTC: localMidnightUtc(startLocalDay, normalizedTz),
    endUTC: localMidnightUtc(endLocalDay, normalizedTz),
  };
}

export function getLocalDayBounds(
  dayKey: string,
  tz: string,
): { startUTC: Date; endUTC: Date; dayKey: string } {
  const normalizedTz = normalizeTenantTimeZone(tz);
  assertValidDayKey(dayKey);
  const nextDay = shiftLocalDateKey(dayKey, 1);

  return {
    dayKey,
    startUTC: localMidnightUtc(dayKey, normalizedTz),
    endUTC: localMidnightUtc(nextDay, normalizedTz),
  };
}

