import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.string().optional(),
  VERCEL_ENV: z.string().optional(),
  APP_ENV: z.string().optional(),
  AUTH_SECRET: z.string().min(16),
  DATABASE_URL: z.string().min(10),
  SEED_TOKEN: z.string().min(8),
  ADMIN_SEED_PASSWORD: z.string().min(8).optional(),
  REDIS_URL: z.string().min(10).optional(),
  GITHUB_TOKEN: z.string().min(10).optional(),
  INTERNAL_DIAG_TOKEN: z.string().min(8).optional(),
  INTERNAL_EXPORT_TOKEN: z.string().min(8).optional(),
  INTERNAL_JOB_TOKEN: z.string().min(8).optional(),
  INTERNAL_TOKEN: z.string().min(8).optional(),
  QA_BOOTSTRAP_TOKEN: z.string().min(8).optional(),
  BOOTSTRAP_TOKEN: z.string().min(8).optional(),
  // 64 chars hex = 32 bytes para AES-256-GCM. Obrigatório em prod via boot-check.
  PROVIDER_SECRETS_KEY: z.string().length(64).optional(),
});

export const env = (() => {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('CRITICAL: Invalid environment variables:', parsed.error.flatten().fieldErrors);
  }
  return parsed.success ? parsed.data : (process.env as any);
})();
