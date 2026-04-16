// Centralized database SSL configuration

export interface DbSslConfig {
    rejectUnauthorized: boolean;
    ca?: string;
}

/**
 * Centralized database SSL configuration.
 * Returns the safest possible SSL configuration based on environment and explicit settings.
 */
export function getDbSslConfig(): DbSslConfig | undefined {
    const isDev = process.env.NODE_ENV === 'development';
    const forceNoSsl = process.env.DATABASE_SSL === 'false';

    // Allow disabling SSL only in development environment
    if (isDev && forceNoSsl) {
        return undefined;
    }

    // Default secure configuration for production/staging
    return {
        rejectUnauthorized: true,
    };
}
