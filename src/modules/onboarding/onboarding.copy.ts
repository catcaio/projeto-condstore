/**
 * onboarding.copy.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Registro central de COPY EASTER EGG para o Onboarding Cinemático.
 * Substitua os placeholders com a copy final com sutileza — sem quebrar nada.
 *
 * Convenção de chaves:
 *   EASTER_EGG_<MOOD>_<TIPO>_<SEQUÊNCIA>
 *
 * Mood:       EASE | CLARITY | SHARED
 * Tipo:       TAGLINE | BODY | CTA | WRAP
 * Sequência:  1, 2, 3, ...
 */

export const onboardingCopy = {
  // ── Ease Mode ────────────────────────────────────────────────────────────
  EASTER_EGG_EASE_TAGLINE_1:    "[EASTER_EGG_PLACEHOLDER_EASE_TAGLINE_1]",
  EASTER_EGG_EASE_TAGLINE_2:    "[EASTER_EGG_PLACEHOLDER_EASE_TAGLINE_2]",
  EASTER_EGG_EASE_BODY_1:       "[EASTER_EGG_PLACEHOLDER_EASE_BODY_1]",
  EASTER_EGG_EASE_WRAP_1:       "[EASTER_EGG_PLACEHOLDER_EASE_WRAP_1]",

  // ── Clarity Mode ─────────────────────────────────────────────────────────
  EASTER_EGG_CLARITY_TAGLINE_1: "[EASTER_EGG_PLACEHOLDER_CLARITY_TAGLINE_1]",
  EASTER_EGG_CLARITY_TAGLINE_2: "[EASTER_EGG_PLACEHOLDER_CLARITY_TAGLINE_2]",
  EASTER_EGG_CLARITY_BODY_1:    "[EASTER_EGG_PLACEHOLDER_CLARITY_BODY_1]",
  EASTER_EGG_CLARITY_BODY_2:    "[EASTER_EGG_PLACEHOLDER_CLARITY_BODY_2]",
  EASTER_EGG_CLARITY_WRAP_1:    "[EASTER_EGG_PLACEHOLDER_CLARITY_WRAP_1]",

  // ── FinOps específico ─────────────────────────────────────────────────────
  EASTER_EGG_FINOPS_EASE_TAG:   "[EASTER_EGG_PLACEHOLDER_FINOPS_EASE_TAG]",
  EASTER_EGG_FINOPS_CLARITY_BODY: "[EASTER_EGG_PLACEHOLDER_FINOPS_CLARITY_BODY]",

  // ── Evolution específico ──────────────────────────────────────────────────
  EASTER_EGG_EVOLUTION_EASE_TAG:  "[EASTER_EGG_PLACEHOLDER_EVOLUTION_EASE_TAG]",
  EASTER_EGG_EVOLUTION_CLARITY_BODY: "[EASTER_EGG_PLACEHOLDER_EVOLUTION_CLARITY_BODY]",

  // ── Frank / Talk-to-me ────────────────────────────────────────────────────
  EASTER_EGG_FRANK_CTA_LABEL:   "[EASTER_EGG_PLACEHOLDER_FRANK_CTA_LABEL]",
  EASTER_EGG_FRANK_BODY:        "[EASTER_EGG_PLACEHOLDER_FRANK_BODY]",
} as const;

export type OnboardingCopyKey = keyof typeof onboardingCopy;
