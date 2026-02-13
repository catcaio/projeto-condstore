/**
 * Central application configuration.
 * All environment variables are loaded and validated here.
 * No process.env calls should exist outside this file.
 */

interface AppConfig {
  env: 'development' | 'production' | 'test';
  port: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  session: {
    ttlHours: number;
    ttlMs: number;
  };
  freight: {
    originCep: string;
    defaultUnitWeight: number; // kg
    maxOptionsToReturn: number;
  };
}

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && !defaultValue) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || defaultValue!;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
}

export const appConfig: AppConfig = {
  env: (process.env.NODE_ENV as AppConfig['env']) || 'development',
  port: getEnvNumber('PORT', 3000),
  logLevel: (process.env.LOG_LEVEL as AppConfig['logLevel']) || 'info',
  
  session: {
    ttlHours: getEnvNumber('SESSION_TTL_HOURS', 6),
    ttlMs: getEnvNumber('SESSION_TTL_HOURS', 6) * 60 * 60 * 1000,
  },

  freight: {
    originCep: getEnv('ORIGIN_CEP', '01001000'),
    defaultUnitWeight: getEnvNumber('DEFAULT_UNIT_WEIGHT_KG', 0.3),
    maxOptionsToReturn: getEnvNumber('MAX_FREIGHT_OPTIONS', 3),
  },
};

/**
 * Validate configuration on startup.
 * Throws if any required config is missing or invalid.
 */
export function validateConfig(): void {
  const required = [
    'ORIGIN_CEP',
    'MELHORENVIO_TOKEN',
    'TABELA_CSV_URL',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file or deployment configuration.'
    );
  }

  // Validate CEP format
  const cepRegex = /^\d{8}$/;
  if (!cepRegex.test(appConfig.freight.originCep)) {
    throw new Error(
      `Invalid ORIGIN_CEP format: ${appConfig.freight.originCep}. ` +
      'Expected 8 digits (e.g., 01001000)'
    );
  }
}
