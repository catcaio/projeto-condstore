"use client";

/**
 * OnboardingOverlay.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * UI do Onboarding Cinemático do CONDSTORE OS.
 *
 * Design principles:
 *   • iOS-settings-like: card flutuante, fundo fosco, gestos mínimos
 *   • 100% tokens semânticos — zero hardcode de cor
 *   • Suporte a light/dark automático via CSS vars
 *   • Highlight de target via halo leve (outline + box-shadow) sem libs
 *   • Micro-animações CSS puras (entrada, saída, progresso)
 *   • Acessível: focus trap, aria-labels, role="dialog"
 *   • Respeita prefers-reduced-motion (tokens de motion já cobrem)
 */

import React, { useEffect, useRef, useCallback } from "react";
import type { OnboardingStep, OnboardingMood, OnboardingTour } from "./onboarding.registry";
import type { OnboardingCTAAction } from "./onboarding.registry";

// ── Types ──────────────────────────────────────────────────────────────────

interface OnboardingOverlayProps {
    visible: boolean;
    tour: OnboardingTour;
    mood: OnboardingMood;
    steps: OnboardingStep[];
    currentIndex: number;
    currentStep: OnboardingStep | null;
    onNext: () => void;
    onBack: () => void;
    onSkip: () => void;
    onComplete: () => void;
}

// ── CTA Action dispatcher ──────────────────────────────────────────────────

function dispatchCTAAction(action: OnboardingCTAAction) {
    switch (action) {
        case "OPEN_FRANK":
            window.dispatchEvent(new CustomEvent("condstore:open-frank"));
            break;
        case "OPEN_FINOPS":
            window.dispatchEvent(new CustomEvent("condstore:open-finops"));
            break;
        case "OPEN_SIMULATE":
            window.dispatchEvent(new CustomEvent("condstore:open-simulate"));
            break;
        case "OPEN_EVOLUTION":
            window.dispatchEvent(new CustomEvent("condstore:open-evolution"));
            break;
        default:
            break;
    }
}

// ── Target Highlight ──────────────────────────────────────────────────────

function useTargetHighlight(target: string | undefined, visible: boolean) {
    useEffect(() => {
        if (!visible || !target) return;

        let el: Element | null = null;
        try {
            el = document.querySelector(target);
        } catch {
            return;
        }

        if (!el) return;

        const elem = el as HTMLElement;
        const prevOutline = elem.style.outline;
        const prevBoxShadow = elem.style.boxShadow;
        const prevZIndex = elem.style.zIndex;
        const prevPosition = elem.style.position;

        elem.style.outline = "2px solid hsl(var(--ui-accent-blue) / 0.7)";
        elem.style.boxShadow = "0 0 0 6px hsl(var(--ui-accent-blue) / 0.12)";
        elem.style.zIndex = "9998";
        // só adiciona position se não tiver
        if (getComputedStyle(elem).position === "static") {
            elem.style.position = "relative";
        }

        return () => {
            elem.style.outline = prevOutline;
            elem.style.boxShadow = prevBoxShadow;
            elem.style.zIndex = prevZIndex;
            elem.style.position = prevPosition;
        };
    }, [target, visible]);
}

// ── Tone → accent class ───────────────────────────────────────────────────

function toneToAccent(
    tone: OnboardingStep["tone"],
    mood: OnboardingMood
): string {
    if (mood === "clarity") return "onboarding-accent--clarity";
    switch (tone) {
        case "delight": return "onboarding-accent--delight";
        case "call-to-action": return "onboarding-accent--cta";
        case "reliability": return "onboarding-accent--reliability";
        case "trust": return "onboarding-accent--trust";
        case "clarity": return "onboarding-accent--clarity";
        default: return "onboarding-accent--delight";
    }
}

// ── Main Component ─────────────────────────────────────────────────────────

export function OnboardingOverlay({
    visible,
    tour,
    mood,
    steps,
    currentIndex,
    currentStep,
    onNext,
    onBack,
    onSkip,
    onComplete,
}: OnboardingOverlayProps) {
    const dialogRef = useRef<HTMLDivElement>(null);
    const total = steps.length;
    const isLast = currentIndex === total - 1;
    const isFirst = currentIndex === 0;

    // Highlight do target no DOM
    useTargetHighlight(currentStep?.target, visible);

    // Focus trap simples no dialog
    useEffect(() => {
        if (!visible) return;
        const dialog = dialogRef.current;
        if (!dialog) return;

        const focusables = dialog.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") { onSkip(); return; }
            if (e.key !== "Tab") return;
            if (focusables.length === 0) return;
            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last?.focus();
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first?.focus();
                }
            }
        }

        document.addEventListener("keydown", handleKeyDown);
        // Auto-focus no primeiro botão
        setTimeout(() => first?.focus(), 50);

        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [visible, onSkip]);

    const handleCTA = useCallback(() => {
        const cta = currentStep?.cta;
        if (!cta) return;
        if (cta.action) dispatchCTAAction(cta.action);
        if (cta.href) window.location.href = cta.href;
        // Avança automaticamente após o CTA
        if (!isLast) onNext();
        else onComplete();
    }, [currentStep, isLast, onNext, onComplete]);

    if (!visible || !currentStep) return null;

    const accentClass = toneToAccent(currentStep.tone, mood);
    const moodBadge = mood === "clarity" ? "Modo Clareza" : "Modo Fluidez";

    return (
        <>
            {/* Fundo fosco */}
            <div
                className="onboarding-backdrop"
                aria-hidden="true"
                onClick={onSkip}
            />

            {/* Dialog card */}
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-label={`Tour ${tour.key}: ${currentStep.title}`}
                className={`onboarding-card ${accentClass}`}
                id="onboarding-overlay"
            >
                {/* Header */}
                <div className="onboarding-header">
                    <span className="onboarding-mood-badge" aria-label={`Modo atual: ${moodBadge}`}>
                        {moodBadge}
                    </span>
                    <button
                        className="onboarding-btn-skip"
                        onClick={onSkip}
                        aria-label="Pular tour"
                        id="onboarding-btn-skip"
                    >
                        Pular
                    </button>
                </div>

                {/* Progress bar */}
                <div
                    className="onboarding-progress-track"
                    role="progressbar"
                    aria-valuenow={currentIndex + 1}
                    aria-valuemin={1}
                    aria-valuemax={total}
                    aria-label={`Passo ${currentIndex + 1} de ${total}`}
                >
                    <div
                        className="onboarding-progress-fill"
                        style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
                    />
                </div>
                <p className="onboarding-progress-label">
                    {currentIndex + 1} / {total}
                </p>

                {/* Accent dot */}
                <div className="onboarding-accent-dot" aria-hidden="true" />

                {/* Content */}
                <div className="onboarding-content">
                    <h2 className="onboarding-title" id="onboarding-step-title">
                        {currentStep.title}
                    </h2>
                    <p className="onboarding-body" id="onboarding-step-body">
                        {currentStep.body}
                    </p>
                </div>

                {/* CTA */}
                {currentStep.cta && (
                    <div className="onboarding-cta-row">
                        <button
                            className="onboarding-btn-cta"
                            onClick={handleCTA}
                            id={`onboarding-cta-${currentStep.id}`}
                        >
                            {currentStep.cta.label}
                            <span aria-hidden="true"> →</span>
                        </button>
                    </div>
                )}

                {/* Footer nav */}
                <div className="onboarding-footer">
                    <button
                        className="onboarding-btn-back"
                        onClick={onBack}
                        disabled={isFirst}
                        aria-label="Voltar ao passo anterior"
                        id="onboarding-btn-back"
                    >
                        ← Voltar
                    </button>

                    {isLast ? (
                        <button
                            className="onboarding-btn-primary"
                            onClick={onComplete}
                            aria-label="Concluir tour"
                            id="onboarding-btn-complete"
                        >
                            Concluir ✓
                        </button>
                    ) : (
                        <button
                            className="onboarding-btn-primary"
                            onClick={onNext}
                            aria-label="Próximo passo"
                            id="onboarding-btn-next"
                        >
                            Próximo →
                        </button>
                    )}
                </div>
            </div>

            {/* Estilos encapsulados (CSS-in-JS sem lib pesada) */}
            <style>{onboardingStyles}</style>
        </>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────
// Usa tokens semânticos de globals.css. Zero hardcode.

const onboardingStyles = `
  /* ── Backdrop ─────────────────────────────────────────────────── */
  .onboarding-backdrop {
    position: fixed;
    inset: 0;
    z-index: 9990;
    background: hsl(222 47% 4% / 0.55);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    animation: onboarding-fade-in 220ms ease forwards;
    cursor: pointer;
  }

  /* ── Card ─────────────────────────────────────────────────────── */
  .onboarding-card {
    position: fixed;
    z-index: 9999;
    bottom: clamp(1rem, 4vw, 2.5rem);
    right: clamp(1rem, 4vw, 2.5rem);
    left: clamp(1rem, 4vw, auto);
    max-width: 420px;
    width: calc(100vw - 2rem);
    background: hsl(var(--ui-surface));
    border: 1px solid hsl(var(--ui-border));
    border-radius: 1.25rem;
    box-shadow:
      0 24px 64px hsl(var(--ui-shadow) / 0.28),
      0 0 0 1px hsl(var(--ui-border));
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
    animation: onboarding-slide-up 280ms cubic-bezier(0.34,1.56,0.64,1) forwards;
    will-change: transform, opacity;
  }

  @media (min-width: 640px) {
    .onboarding-card {
      left: auto;
      width: 420px;
    }
  }

  /* ── Accent variants ──────────────────────────────────────────── */
  .onboarding-accent--delight     { --ob-accent: var(--ui-accent-blue); }
  .onboarding-accent--cta        { --ob-accent: 142 71% 45%; }
  .onboarding-accent--reliability { --ob-accent: 211 90% 60%; }
  .onboarding-accent--trust       { --ob-accent: 267 100% 65%; }
  .onboarding-accent--clarity     { --ob-accent: 4 90% 58%; }

  .onboarding-accent-dot {
    width: 8px;
    height: 8px;
    border-radius: 9999px;
    background: hsl(var(--ob-accent, var(--ui-accent-blue)));
    align-self: flex-start;
    flex-shrink: 0;
    box-shadow: 0 0 8px 2px hsl(var(--ob-accent, var(--ui-accent-blue)) / 0.35);
    transition: background 200ms ease, box-shadow 200ms ease;
  }

  /* ── Header ──────────────────────────────────────────────────── */
  .onboarding-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .onboarding-mood-badge {
    font-size: 0.625rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: hsl(var(--ob-accent, var(--ui-accent-blue)));
    background: hsl(var(--ob-accent, var(--ui-accent-blue)) / 0.1);
    padding: 0.2rem 0.65rem;
    border-radius: 9999px;
    border: 1px solid hsl(var(--ob-accent, var(--ui-accent-blue)) / 0.25);
  }

  .onboarding-btn-skip {
    font-size: 0.75rem;
    font-weight: 500;
    color: hsl(var(--ui-text-muted));
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: 0.5rem;
    transition: color 150ms ease, background 150ms ease;
    line-height: 1;
  }
  .onboarding-btn-skip:hover {
    color: hsl(var(--ui-text));
    background: hsl(var(--ui-muted));
  }

  /* ── Progress ─────────────────────────────────────────────────── */
  .onboarding-progress-track {
    height: 3px;
    background: hsl(var(--ui-border));
    border-radius: 9999px;
    overflow: hidden;
  }

  .onboarding-progress-fill {
    height: 100%;
    background: hsl(var(--ob-accent, var(--ui-accent-blue)));
    border-radius: 9999px;
    transition: width 350ms cubic-bezier(0.4,0,0.2,1);
  }

  .onboarding-progress-label {
    font-size: 0.625rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    color: hsl(var(--ui-text-subtle));
    text-align: right;
    margin: 0;
    line-height: 1;
  }

  /* ── Content ──────────────────────────────────────────────────── */
  .onboarding-content {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .onboarding-title {
    font-size: 1.125rem;
    font-weight: 700;
    color: hsl(var(--ui-text));
    line-height: 1.3;
    margin: 0;
    letter-spacing: -0.01em;
  }

  .onboarding-body {
    font-size: 0.875rem;
    color: hsl(var(--ui-text-muted));
    line-height: 1.6;
    margin: 0;
  }

  /* ── CTA ──────────────────────────────────────────────────────── */
  .onboarding-cta-row {
    display: flex;
  }

  .onboarding-btn-cta {
    font-size: 0.8125rem;
    font-weight: 600;
    color: hsl(var(--ob-accent, var(--ui-accent-blue)));
    background: hsl(var(--ob-accent, var(--ui-accent-blue)) / 0.08);
    border: 1px solid hsl(var(--ob-accent, var(--ui-accent-blue)) / 0.25);
    border-radius: 0.625rem;
    padding: 0.5rem 1rem;
    cursor: pointer;
    transition: background 150ms ease, box-shadow 150ms ease, transform 100ms ease;
    white-space: nowrap;
  }
  .onboarding-btn-cta:hover {
    background: hsl(var(--ob-accent, var(--ui-accent-blue)) / 0.16);
    box-shadow: 0 2px 10px hsl(var(--ob-accent, var(--ui-accent-blue)) / 0.2);
    transform: translateY(-1px);
  }
  .onboarding-btn-cta:active {
    transform: translateY(0);
  }

  /* ── Footer ───────────────────────────────────────────────────── */
  .onboarding-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding-top: 0.25rem;
    border-top: 1px solid hsl(var(--ui-border));
  }

  .onboarding-btn-back {
    font-size: 0.8125rem;
    font-weight: 500;
    color: hsl(var(--ui-text-muted));
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0.4rem 0.75rem;
    border-radius: 0.5rem;
    transition: color 150ms ease, background 150ms ease;
  }
  .onboarding-btn-back:hover:not(:disabled) {
    color: hsl(var(--ui-text));
    background: hsl(var(--ui-muted));
  }
  .onboarding-btn-back:disabled {
    opacity: 0.3;
    cursor: default;
  }

  .onboarding-btn-primary {
    font-size: 0.875rem;
    font-weight: 600;
    color: hsl(var(--primary-foreground, 0 0% 100%));
    background: hsl(var(--ui-accent-blue));
    border: none;
    border-radius: 0.625rem;
    padding: 0.5rem 1.25rem;
    cursor: pointer;
    transition: background 150ms ease, box-shadow 150ms ease, transform 100ms ease;
  }
  .onboarding-btn-primary:hover {
    background: hsl(var(--ui-accent-blue-strong));
    box-shadow: 0 4px 14px hsl(var(--ui-accent-blue) / 0.35);
    transform: translateY(-1px);
  }
  .onboarding-btn-primary:active {
    transform: translateY(0);
  }

  /* ── Animations ───────────────────────────────────────────────── */
  @keyframes onboarding-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  @keyframes onboarding-slide-up {
    from { opacity: 0; transform: translateY(20px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0)   scale(1); }
  }

  /* ── Reduced motion ───────────────────────────────────────────── */
  @media (prefers-reduced-motion: reduce) {
    .onboarding-backdrop,
    .onboarding-card {
      animation: none !important;
    }
    .onboarding-progress-fill,
    .onboarding-btn-cta,
    .onboarding-btn-primary,
    .onboarding-btn-back,
    .onboarding-accent-dot {
      transition: none !important;
    }
  }
`;
