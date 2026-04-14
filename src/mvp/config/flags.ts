/**
 * MVP feature flags.
 *
 * Controlled by the NEXT_PUBLIC_ENABLE_MVP environment variable.
 * Set it to "true" to activate the /mvp route and its sub-features.
 */
export const MVP_ENABLED = process.env.NEXT_PUBLIC_ENABLE_MVP === 'true';

export const MVP_FLAGS = {
  /** Master switch — gates the /mvp route entirely. */
  enabled: MVP_ENABLED,
  /** Activate the public landing section at /mvp. */
  publicLanding: MVP_ENABLED,
  /** Activate the minimal cockpit view inside /mvp/app. */
  miniCockpit: MVP_ENABLED,
} as const;
