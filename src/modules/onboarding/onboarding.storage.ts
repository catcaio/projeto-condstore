/**
 * onboarding.storage.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Persistência leve de estado de onboarding via localStorage.
 *
 * Key format:
 *   condstore:onboarding:{tourKey}:{tenantId}:{userKey}
 *
 * userKey = userId || "anon"
 *
 * O registro inclui { completedAt, skippedAt, version, mood }.
 * A verificação de versão garante que um bump de tour.version re-exiba o tour
 * mesmo para usuários que já viram versões anteriores.
 */

import type { OnboardingMood } from "./onboarding.registry";

// ── Types ──────────────────────────────────────────────────────────────────

export interface OnboardingRecord {
    version: string;
    mood: OnboardingMood;
    completedAt?: string; // ISO 8601
    skippedAt?: string;   // ISO 8601
}

// ── Storage helpers ────────────────────────────────────────────────────────

function buildKey(
    tourKey: string,
    tenantId: string,
    userId?: string | null
): string {
    const userKey = userId || "anon";
    return `condstore:onboarding:${tourKey}:${tenantId}:${userKey}`;
}

function isLocalStorageAvailable(): boolean {
    if (typeof window === "undefined") return false;
    try {
        const testKey = "__condstore_ls_test__";
        window.localStorage.setItem(testKey, "1");
        window.localStorage.removeItem(testKey);
        return true;
    } catch {
        return false;
    }
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Lê o registro salvo para um tour + tenant + usuário.
 * Retorna null se não existir ou se a leitura falhar.
 */
export function getOnboardingRecord(
    tourKey: string,
    tenantId: string,
    userId?: string | null
): OnboardingRecord | null {
    if (!isLocalStorageAvailable()) return null;
    try {
        const key = buildKey(tourKey, tenantId, userId);
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw) as OnboardingRecord;
    } catch {
        return null;
    }
}

/**
 * Marca o tour como CONCLUÍDO para o usuário/tenant.
 */
export function markOnboardingCompleted(
    tourKey: string,
    version: string,
    mood: OnboardingMood,
    tenantId: string,
    userId?: string | null
): void {
    if (!isLocalStorageAvailable()) return;
    try {
        const key = buildKey(tourKey, tenantId, userId);
        const existing = getOnboardingRecord(tourKey, tenantId, userId);
        const record: OnboardingRecord = {
            ...existing,
            version,
            mood,
            completedAt: new Date().toISOString(),
        };
        window.localStorage.setItem(key, JSON.stringify(record));
    } catch {
        // Falha silenciosa — localStorage cheio ou bloqueado
    }
}

/**
 * Marca o tour como PULADO (skip) para o usuário/tenant.
 */
export function markOnboardingSkipped(
    tourKey: string,
    version: string,
    mood: OnboardingMood,
    tenantId: string,
    userId?: string | null
): void {
    if (!isLocalStorageAvailable()) return;
    try {
        const key = buildKey(tourKey, tenantId, userId);
        const existing = getOnboardingRecord(tourKey, tenantId, userId);
        const record: OnboardingRecord = {
            ...existing,
            version,
            mood,
            skippedAt: new Date().toISOString(),
        };
        window.localStorage.setItem(key, JSON.stringify(record));
    } catch {
        // Falha silenciosa
    }
}

/**
 * Verifica se o tour já foi visto (concluído OU pulado) na versão atual.
 */
export function hasSeenOnboarding(
    tourKey: string,
    tourVersion: string,
    tenantId: string,
    userId?: string | null
): boolean {
    const record = getOnboardingRecord(tourKey, tenantId, userId);
    if (!record) return false;
    // Só considera "visto" se a versão bater — novo conteúdo re-exibe
    if (record.version !== tourVersion) return false;
    return !!(record.completedAt || record.skippedAt);
}

/**
 * Reseta o estado de onboarding (útil para QA / debug).
 */
export function resetOnboarding(
    tourKey: string,
    tenantId: string,
    userId?: string | null
): void {
    if (!isLocalStorageAvailable()) return;
    try {
        const key = buildKey(tourKey, tenantId, userId);
        window.localStorage.removeItem(key);
    } catch {
        // Falha silenciosa
    }
}
