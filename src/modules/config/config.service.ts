import { configRepository } from './config.repository';
import { emitConfigCreated, emitConfigUpdated, emitConfigDeleted } from './config.events';
import { SetConfigInput, GetConfigOutput, ConfigCategory } from './config.types';

export class ConfigService {
    async getConfig<T = any>(tenantId: string, key: string, defaultValue?: T): Promise<GetConfigOutput<T> | null> {
        const config = await configRepository.get(tenantId, key);
        if (!config && defaultValue !== undefined) {
            return {
                id: 'default',
                key,
                value: defaultValue,
                category: 'operacao', // Fallback
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'system'
            };
        }
        return config as GetConfigOutput<T> | null;
    }

    async getConfigValue<T = any>(tenantId: string, key: string, defaultValue?: T): Promise<T> {
        const config = await this.getConfig<T>(tenantId, key, defaultValue);
        if (!config) {
            throw new Error(`Configuration not found for key: ${key}`);
        }
        return config.value;
    }

    async listConfigs(tenantId: string, category?: string): Promise<GetConfigOutput[]> {
        return await configRepository.list(tenantId, category);
    }

    async setConfig(input: SetConfigInput): Promise<GetConfigOutput> {
        const existing = await configRepository.get(input.tenantId, input.key);
        
        const result = await configRepository.upsert(input);

        if (existing) {
            await emitConfigUpdated(input.tenantId, input.key, input.category, input.createdBy);
        } else {
            await emitConfigCreated(input.tenantId, input.key, input.category, input.createdBy);
        }

        return result;
    }

    async deleteConfig(tenantId: string, key: string, category: ConfigCategory, deletedBy?: string): Promise<boolean> {
        const success = await configRepository.remove(tenantId, key);
        if (success) {
            await emitConfigDeleted(tenantId, key, category, deletedBy);
        }
        return success;
    }
}

export const configService = new ConfigService();
