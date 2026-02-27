/**
 * instrumentation.ts — Next.js server startup hook
 *
 * Executado UMA VEZ quando o processo Node.js inicializa (antes de qualquer request).
 * Falha rápido em produção se variáveis críticas estiverem ausentes.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

import { captureNextRequestErrorWithSentry } from './src/infra/observability/sentry';

export async function register() {
  const isProd = process.env.NODE_ENV === 'production';
  const runtime = process.env.NEXT_RUNTIME;

  if (runtime === 'nodejs') {
    const missing: string[] = [];

    if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');
    if (!process.env.AUTH_SECRET) missing.push('AUTH_SECRET');

    // Em produção: PROVIDER_SECRETS_KEY obrigatória para proteger apiKeys de providers
    // Exception: CI runners não precisam dessa key pois não acessam dados criptografados reais
    const isCI = process.env.CI === 'true';
    if (isProd && !isCI && !process.env.PROVIDER_SECRETS_KEY) {
      missing.push('PROVIDER_SECRETS_KEY');
    }

    if (missing.length > 0) {
      const msg = `[boot-check] Env vars críticas ausentes: ${missing.join(', ')}`;
      if (isProd) {
        // Hard-fail: processo não deve continuar sem configuração mínima
        throw new Error(msg);
      }
      // Dev: warn visível mas não bloqueia
      console.warn(msg);
    } else {
      const mode = isProd ? 'production' : 'development';
      console.log(`[boot-check] ✅ Todas as env vars críticas presentes (${mode})`);
    }
  }

  if (runtime === 'nodejs') {
    await import('./sentry.server.config');
  } else if (runtime === 'edge') {
    await import('./sentry.edge.config');
  }
}

export async function onRequestError(...args: unknown[]): Promise<void> {
  await captureNextRequestErrorWithSentry(...args);
}
