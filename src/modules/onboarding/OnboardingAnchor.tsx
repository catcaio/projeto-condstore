"use client";

/**
 * OnboardingAnchor.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Wrapper de página: recebe pathname + contexto de sessão, consulta o hook
 * e renderiza o overlay quando aplicável.
 *
 * Uso:
 *   <OnboardingAnchor pathname="/cockpit" tenantId={tenantId} userId={userId} />
 *
 * • Suspense boundary automático (useSearchParams exige isso no App Router)
 * • Nenhum efeito colateral se nenhum tour estiver cadastrado para a rota
 */

import React, { Suspense } from "react";
import { useOnboarding } from "./useOnboarding";
import { OnboardingOverlay } from "./OnboardingOverlay";

// ── Types ──────────────────────────────────────────────────────────────────

interface OnboardingAnchorProps {
    pathname: string;
    tenantId: string;
    userId?: string | null;
}

// ── Inner (precisa estar dentro de Suspense pois usa useSearchParams) ───────

function OnboardingAnchorInner({
    pathname,
    tenantId,
    userId,
}: OnboardingAnchorProps) {
    const {
        visible,
        tour,
        mood,
        steps,
        currentIndex,
        currentStep,
        next,
        back,
        skip,
        complete,
    } = useOnboarding(pathname, tenantId, userId);

    if (!visible || !tour || !currentStep) return null;

    return (
        <OnboardingOverlay
            visible={visible}
            tour={tour}
            mood={mood}
            steps={steps}
            currentIndex={currentIndex}
            currentStep={currentStep}
            onNext={next}
            onBack={back}
            onSkip={skip}
            onComplete={complete}
        />
    );
}

// ── Public export (com Suspense boundary) ──────────────────────────────────

export function OnboardingAnchor(props: OnboardingAnchorProps) {
    return (
        <Suspense fallback={null}>
            <OnboardingAnchorInner {...props} />
        </Suspense>
    );
}
