import { tenantSecretsRepository } from '../repositories/tenant-secrets.repository';
import { decryptSecret } from './encryption';
import { structuredLogger } from '../log/logger';

export interface ResolvedSecret {
    value: string;
    source: 'DB' | 'ENV';
}

export const secretResolver = {
    /**
     * Resolves a secret by checking the database first, then falling back to env.
     */
    async resolve(tenantId: string, scope: string, keyName: string, envFallbackKey: string): Promise<ResolvedSecret> {
        try {
            const dbSecret = await tenantSecretsRepository.getByKeyName(tenantId, scope, keyName);
            if (dbSecret && dbSecret.valueEncrypted) {
                return {
                    value: decryptSecret(dbSecret.valueEncrypted),
                    source: 'DB',
                };
            }
        } catch (error) {
            structuredLogger.error('Failed to resolve secret from DB, falling back to ENV', { err: error, tenantId, scope, keyName });
        }

        // Fallback to Env
        const envVal = process.env[envFallbackKey];
        if (!envVal) {
            throw new Error(`Secret ${keyName} not found in DB and fallback ${envFallbackKey} is missing from ENV`);
        }

        return {
            value: envVal,
            source: 'ENV',
        };
    },

    /**
     * Simple wrapper that returns only the value
     */
    async getValue(tenantId: string, scope: string, keyName: string, envFallbackKey: string): Promise<string> {
        const res = await this.resolve(tenantId, scope, keyName, envFallbackKey);
        return res.value;
    }
};
