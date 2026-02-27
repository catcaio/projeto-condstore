/**
 * src/modules/onboarding/index.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Public API do módulo de Onboarding Cinemático.
 */

// ── Components (client) ───────────────────────────────────────────────────
export { OnboardingAnchor } from "./OnboardingAnchor";
export { OnboardingOverlay } from "./OnboardingOverlay";

// ── Hook ──────────────────────────────────────────────────────────────────
export { useOnboarding } from "./useOnboarding";
export type { UseOnboardingReturn } from "./useOnboarding";

// ── Registry ──────────────────────────────────────────────────────────────
export {
    onboardingTours,
    getTourForPath,
    filterStepsByMood,
} from "./onboarding.registry";
export type {
    OnboardingMood,
    OnboardingTone,
    OnboardingCTA,
    OnboardingCTAAction,
    OnboardingStep,
    OnboardingTour,
} from "./onboarding.registry";

// ── Storage ───────────────────────────────────────────────────────────────
export {
    getOnboardingRecord,
    markOnboardingCompleted,
    markOnboardingSkipped,
    hasSeenOnboarding,
    resetOnboarding,
} from "./onboarding.storage";
export type { OnboardingRecord } from "./onboarding.storage";

// ── Copy registry ─────────────────────────────────────────────────────────
export { onboardingCopy } from "./onboarding.copy";
export type { OnboardingCopyKey } from "./onboarding.copy";
