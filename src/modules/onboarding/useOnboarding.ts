"use client";

/**
 * useOnboarding.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Hook que decide se o overlay de onboarding deve ser exibido, e expõe
 * os handlers para avançar, voltar, pular e concluir.
 *
 * Regras de exibição:
 *   1. NEXT_PUBLIC_ONBOARDING_ENABLED !== "1" → nunca exibe
 *   2. Não existe tour cadastrado para o pathname → nunca exibe
 *   3. Já foi concluído/pulado nesta versão → nunca exibe
 *   4. Query param ?onboarding=1 → força exibição (modo QA)
 *   5. Query param ?mood=ease|clarity → sobrescreve defaultMood (QA)
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
    getTourForPath,
    filterStepsByMood,
    type OnboardingTour,
    type OnboardingStep,
    type OnboardingMood,
} from "./onboarding.registry";
import {
    hasSeenOnboarding,
    markOnboardingCompleted,
    markOnboardingSkipped,
} from "./onboarding.storage";

// Feature flag — lida com ausência da variável de forma segura (client-side)
const ONBOARDING_ENABLED =
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_ONBOARDING_ENABLED === "1";

// ── Hook ───────────────────────────────────────────────────────────────────

export interface UseOnboardingReturn {
    /** Se true → renderizar o overlay */
    visible: boolean;
    /** Tour ativo */
    tour: OnboardingTour | null;
    /** Mood ativo (considerando query param) */
    mood: OnboardingMood;
    /** Steps filtrados pelo mood ativo */
    steps: OnboardingStep[];
    /** Índice do step atual */
    currentIndex: number;
    /** Step atual */
    currentStep: OnboardingStep | null;
    /** Avança para o próximo step */
    next: () => void;
    /** Volta para o step anterior */
    back: () => void;
    /** Pula o tour inteiro */
    skip: () => void;
    /** Conclui o tour no último step */
    complete: () => void;
}

export function useOnboarding(
    pathname: string,
    tenantId: string,
    userId?: string | null
): UseOnboardingReturn {
    const searchParams = useSearchParams();

    // ── Resolve mood ──────────────────────────────────────────────────────
    const tour = useMemo(() => getTourForPath(pathname), [pathname]);

    const qaForce = searchParams.get("onboarding") === "1";
    const qaMood = searchParams.get("mood") as OnboardingMood | null;

    const mood: OnboardingMood = useMemo(() => {
        if (qaMood === "ease" || qaMood === "clarity") return qaMood;
        return tour?.defaultMood ?? "ease";
    }, [qaMood, tour]);

    const steps = useMemo(
        () => (tour ? filterStepsByMood(tour.steps, mood) : []),
        [tour, mood]
    );

    // ── Visibilidade ──────────────────────────────────────────────────────
    const [visible, setVisible] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (!tour) return;
        if (steps.length === 0) return;

        const enabled = ONBOARDING_ENABLED || qaForce;
        if (!enabled) return;

        const seen = hasSeenOnboarding(
            tour.key,
            tour.version,
            tenantId,
            userId
        );
        if (seen && !qaForce) return;

        // Pequeno delay para não brigar com o layout initial
        const timer = setTimeout(() => {
            setCurrentIndex(0);
            setVisible(true);
        }, 600);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tour?.key, tour?.version, tenantId, userId, qaForce, steps.length]);

    // ── Handlers ──────────────────────────────────────────────────────────
    const next = useCallback(() => {
        setCurrentIndex((i) => {
            if (i < steps.length - 1) return i + 1;
            return i; // no-op no último — use complete()
        });
    }, [steps.length]);

    const back = useCallback(() => {
        setCurrentIndex((i) => Math.max(0, i - 1));
    }, []);

    const skip = useCallback(() => {
        if (!tour) return;
        setVisible(false);
        markOnboardingSkipped(tour.key, tour.version, mood, tenantId, userId);
    }, [tour, mood, tenantId, userId]);

    const complete = useCallback(() => {
        if (!tour) return;
        setVisible(false);
        markOnboardingCompleted(tour.key, tour.version, mood, tenantId, userId);
    }, [tour, mood, tenantId, userId]);

    const currentStep = steps[currentIndex] ?? null;

    return {
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
    };
}
