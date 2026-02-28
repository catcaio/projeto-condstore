import { MODULES, type ModuleConfig } from './modules';

export function findModuleForPath(pathname: string): ModuleConfig | undefined {
    for (const mod of MODULES) {
        for (const r of mod.routes) {
            const regexStr = r.pattern.replace(/:[^\s/]+/g, '([^/]+)');
            const regex = new RegExp(`^${regexStr}$`);
            if (regex.test(pathname)) {
                return mod;
            }
        }
    }

    // Fallback prefix matcher
    const sorted = [...MODULES].sort((a, b) => b.route.length - a.route.length);
    for (const mod of sorted) {
        if (pathname === mod.route || pathname.startsWith(`${mod.route}/`)) {
            return mod;
        }
    }

    return undefined;
}

export function isModuleAuthorized(mod: ModuleConfig, role: string, hasPlan: boolean): { authorized: boolean, reason: 'role' | 'plan' | 'ok' } {
    if (role === 'super_admin' || role === 'admin') {
        return { authorized: true, reason: 'ok' };
    }

    if (mod.requiredRoles && !mod.requiredRoles.includes(role as any)) {
        return { authorized: false, reason: 'role' };
    }

    if (mod.requiredPlan && !hasPlan) {
        return { authorized: false, reason: 'plan' };
    }

    return { authorized: true, reason: 'ok' };
}
