/**
 * instrumentation.ts — Next.js server startup hook
 *
 * Executado UMA VEZ quando o processo Node.js inicializa (antes de qualquer request).
 * Falha rápido em produção se variáveis críticas estiverem ausentes.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Roda apenas no runtime Node.js (não no Edge runtime)
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const isProd = process.env.NODE_ENV === 'production';
  const missing: string[] = [];

  if (!process.env.DATABASE_URL)  missing.push('DATABASE_URL');
  if (!process.env.AUTH_SECRET)   missing.push('AUTH_SECRET');

  // Em produção: PROVIDER_SECRETS_KEY obrigatória para proteger apiKeys de providers
  if (isProd && !process.env.PROVIDER_SECRETS_KEY) {
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
