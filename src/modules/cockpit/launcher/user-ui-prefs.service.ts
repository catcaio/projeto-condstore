import { userUiPrefsRepository } from './user-ui-prefs.repository';

export class UserUiPrefsService {
    async getPinnedModules(tenantId: string, userId: string): Promise<string[]> {
        if (!tenantId || !userId) {
            throw new Error("Missing tenantId or userId required to fetch UI preferences");
        }
        return await userUiPrefsRepository.getPins(tenantId, userId);
    }

    async setPinnedModules(tenantId: string, userId: string, pinnedModuleIds: string[]): Promise<void> {
        if (!tenantId || !userId) {
            throw new Error("Missing tenantId or userId required to set UI preferences");
        }
        await userUiPrefsRepository.setPins(tenantId, userId, pinnedModuleIds);
    }
}

export const userUiPrefsService = new UserUiPrefsService();
