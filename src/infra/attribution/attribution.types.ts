export type AttributionGroupBy = 'utm_source' | 'utm_campaign';

export interface AttributionSnapshot {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  refToken?: string | null;
  clickId?: string | null;
}

export interface AttributionClickFields extends AttributionSnapshot {
  token: string;
  tenantId?: string | null;
  landingUrl?: string | null;
  userAgentHash?: string | null;
  ipHash?: string | null;
}

export function normalizeAttributionSnapshot(
  input: Partial<AttributionSnapshot> | null | undefined,
): AttributionSnapshot | null {
  if (!input) return null;

  const normalized: AttributionSnapshot = {
    utmSource: normalizeNullable(input.utmSource),
    utmMedium: normalizeNullable(input.utmMedium),
    utmCampaign: normalizeNullable(input.utmCampaign),
    utmTerm: normalizeNullable(input.utmTerm),
    utmContent: normalizeNullable(input.utmContent),
    refToken: normalizeNullable(input.refToken),
    clickId: normalizeNullable(input.clickId),
  };

  return Object.values(normalized).some((value) => value)
    ? normalized
    : null;
}

function normalizeNullable(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 255) : null;
}
