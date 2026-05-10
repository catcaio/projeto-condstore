import { clickupConfig } from './clickup-config';

export const clickupLogger = {
  info: (message: string, ...args: any[]) => {
    console.log(`[CLICKUP][INFO] ${message}`, ...args.map(redactSensitive));
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[CLICKUP][WARN] ${message}`, ...args.map(redactSensitive));
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[CLICKUP][ERROR] ${message}`, ...args.map(redactSensitive));
  },
  success: (message: string, ...args: any[]) => {
    console.log(`[CLICKUP][SUCCESS] ${message}`, ...args.map(redactSensitive));
  },
  dryRun: (message: string, ...args: any[]) => {
    console.log(`[CLICKUP][DRY-RUN] ${message}`, ...args.map(redactSensitive));
  }
};

function redactSensitive(val: any): any {
  if (typeof val === 'string') {
    if (val === clickupConfig.apiToken) return '[REDACTED_TOKEN]';
    if (val.includes('pk_')) return val.replace(/pk_[a-zA-Z0-9]{20,}/g, '[REDACTED_TOKEN_PATTERN]');
  }
  if (typeof val === 'object' && val !== null) {
    const redacted: any = Array.isArray(val) ? [] : {};
    for (const key in val) {
      redacted[key] = redactSensitive(val[key]);
    }
    return redacted;
  }
  return val;
}
