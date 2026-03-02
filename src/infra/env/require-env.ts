export function requireEnv(key: string, fallback?: string): string {
    const val = process.env[key];
    if (!val) {
        if (fallback !== undefined) {
            if (process.env.NODE_ENV !== "production") {
                console.warn(`[WARN] Missing env ${key}. Using fallback in non-production environment.`);
                return fallback;
            }
            return fallback; // Allow fallback in production if explicitly provided
        }
        throw new Error(`CRITICAL STARTUP ERROR: Missing required environment variable: ${key}`);
    }
    return val;
}

export function assertCriticalEnvSetup() {
    if (process.env.NODE_ENV === "test" || process.env.CI === "true") return; // Bypass rigid checks for CI runners

    requireEnv("DATABASE_URL");

    if (process.env.NODE_ENV === 'production') {
        requireEnv("INTERNAL_TOKEN");
    }

    // NEXT_PUBLIC_APP_URL is technically optional for Next.js internal links but critical for hooks
    requireEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");

    console.log("✅ Critical Environment Variables Verified.");
}
