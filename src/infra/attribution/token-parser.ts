const TOKEN_PATTERNS: RegExp[] = [
  /#t=([A-Za-z0-9_-]{3,128})/i,
  /\bt=([A-Za-z0-9_-]{3,128})\b/i,
  /\btoken:([A-Za-z0-9_-]{3,128})\b/i,
];

export function extractAttributionTokenFromText(text: string | null | undefined): string | null {
  if (!text) return null;

  for (const pattern of TOKEN_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}
