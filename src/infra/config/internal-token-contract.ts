import { safeCompare } from '@/lib/security/safe-compare';

export type InternalTokenPurpose = 'diag' | 'export' | 'jobs' | 'qa_bootstrap' | 'any';

export const INTERNAL_TOKEN_ENV_CONTRACT = {
  diag: {
    official: ['INTERNAL_DIAG_TOKEN'],
    legacy: [],
  },
  export: {
    official: ['INTERNAL_EXPORT_TOKEN'],
    legacy: [],
  },
  jobs: {
    official: ['INTERNAL_JOB_TOKEN'],
    legacy: ['INTERNAL_TOKEN'],
  },
  qa_bootstrap: {
    official: ['QA_BOOTSTRAP_TOKEN'],
    legacy: [],
  },
} as const;

export const INTERNAL_BOOTSTRAP_ENV_CONTRACT = {
  official: 'BOOTSTRAP_TOKEN',
} as const;

export function isStrictRuntimeEnvironment(): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL_ENV === 'production' ||
    process.env.VERCEL_ENV === 'preview' ||
    process.env.APP_ENV === 'staging'
  );
}

export function isDevRuntimeEnvironment(): boolean {
  return !isStrictRuntimeEnvironment() && process.env.NODE_ENV === 'development';
}

function trimEnvValue(key: string): string | null {
  const value = process.env[key]?.trim();
  return value ? value : null;
}

function dedupe(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

export function getInternalTokenEnvKeys(purpose: Exclude<InternalTokenPurpose, 'any'>): {
  official: readonly string[];
  legacy: readonly string[];
} {
  return INTERNAL_TOKEN_ENV_CONTRACT[purpose];
}

export function getOfficialInternalTokens(purpose: Exclude<InternalTokenPurpose, 'any'>): string[] {
  return dedupe(getInternalTokenEnvKeys(purpose).official.map(trimEnvValue));
}

export function getAcceptedInternalTokens(purpose: Exclude<InternalTokenPurpose, 'any'>): string[] {
  const envKeys = getInternalTokenEnvKeys(purpose);
  return dedupe([...envKeys.official, ...envKeys.legacy].map(trimEnvValue));
}

export function getAllAcceptedInternalTokens(): string[] {
  return dedupe([
    ...getAcceptedInternalTokens('diag'),
    ...getAcceptedInternalTokens('export'),
    ...getAcceptedInternalTokens('jobs'),
  ]);
}

export function getAcceptedQaBootstrapTokens(): string[] {
  return getAcceptedInternalTokens('qa_bootstrap');
}

export function getMissingCriticalInternalTokenEnvs(): string[] {
  const purposes: Array<Exclude<InternalTokenPurpose, 'any' | 'qa_bootstrap'>> = ['diag', 'export', 'jobs'];
  const missing: string[] = [];

  for (const purpose of purposes) {
    const configuredOfficial = getOfficialInternalTokens(purpose);
    if (configuredOfficial.length === 0) {
      missing.push(...getInternalTokenEnvKeys(purpose).official);
    }
  }

  return missing;
}

export interface InternalRequestCredentials {
  token: string | null;
  qaToken: string | null;
  bootstrapToken: string | null;
}

export function extractInternalRequestCredentials(request: { headers: Pick<Headers, 'get'>; nextUrl?: { searchParams: URLSearchParams }; url?: string }): InternalRequestCredentials {
  const searchParams = request.nextUrl?.searchParams ?? new URL(request.url ?? 'http://localhost').searchParams;

  return {
    token: request.headers.get('x-internal-token') || searchParams.get('token'),
    qaToken:
      request.headers.get('x-qa-token') ||
      request.headers.get('x-qa-bootstrap') ||
      searchParams.get('qaToken') ||
      searchParams.get('token'),
    bootstrapToken: request.headers.get('x-bootstrap-token'),
  };
}

export function isInternalTokenAuthorizedForPurpose(
  purpose: InternalTokenPurpose,
  credentials: Pick<InternalRequestCredentials, 'token' | 'qaToken'>,
): boolean {
  if (purpose === 'any') {
    return (
      isInternalTokenAuthorizedForPurpose('diag', credentials) ||
      isInternalTokenAuthorizedForPurpose('export', credentials) ||
      isInternalTokenAuthorizedForPurpose('jobs', credentials)
    );
  }

  if (purpose === 'qa_bootstrap') {
    return getAcceptedQaBootstrapTokens().some(candidate => safeCompare(credentials.qaToken, candidate));
  }

  return getAcceptedInternalTokens(purpose).some(candidate => safeCompare(credentials.token, candidate));
}

export function isBootstrapTokenAuthorized(token: string | null | undefined): boolean {
  const expected = trimEnvValue(INTERNAL_BOOTSTRAP_ENV_CONTRACT.official);
  return Boolean(expected && safeCompare(token, expected));
}
