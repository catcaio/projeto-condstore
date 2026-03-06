'use server';

import { headers } from 'next/headers';
import { userUiPrefsService } from '@/modules/cockpit/launcher/user-ui-prefs.service';
import { revalidatePath } from 'next/cache';

export async function getUserPinsAction() {
    const headersList = await headers();
    const tenantId = headersList.get('x-auth-tenant-id');
    const userId = headersList.get('x-auth-user-id');

    if (!tenantId || !userId) {
        throw new Error("Unauthorized access: missing identity context.");
    }

    return await userUiPrefsService.getPinnedModules(tenantId, userId);
}

export async function setUserPinsAction(pinnedModuleIds: string[]) {
    const headersList = await headers();
    const tenantId = headersList.get('x-auth-tenant-id');
    const userId = headersList.get('x-auth-user-id');

    if (!tenantId || !userId) {
        throw new Error("Unauthorized access: missing identity context.");
    }

    await userUiPrefsService.setPinnedModules(tenantId, userId, pinnedModuleIds);
    revalidatePath('/cockpit');
    revalidatePath('/cockpit/funcionalidades');
}
