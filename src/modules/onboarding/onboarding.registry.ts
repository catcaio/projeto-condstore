/**
 * onboarding.registry.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Registry de tours do Onboarding Cinemático do CONDSTORE OS.
 *
 * Cada tour é identificado por:
 *   key      → ID único (ex: "cockpit.v1")
 *   version  → bumpar quando o conteúdo mudar de forma relevante
 *   routes   → paths exatos (ex: "/cockpit", "/cockpit/finops")
 *   steps    → sequência de micro-steps com mood, tone, easter eggs opcionais
 *
 * NOTE:
 *   • body/title dos steps usam onboardingCopy para os easter eggs
 *   • strings sem chave easter egg são UI chrome (ex: botões, labels de progresso)
 */

import { onboardingCopy } from "./onboarding.copy";

// ── Types ──────────────────────────────────────────────────────────────────

export type OnboardingMood = "ease" | "clarity";

export type OnboardingTone =
    | "delight"
    | "reliability"
    | "call-to-action"
    | "trust"
    | "clarity";

export type OnboardingCTAAction =
    | "OPEN_FINOPS"
    | "OPEN_SIMULATE"
    | "OPEN_EVOLUTION"
    | "OPEN_FRANK";

export interface OnboardingCTA {
    label: string;
    href?: string;
    action?: OnboardingCTAAction;
}

export interface OnboardingStep {
    /** Identificador único dentro do tour */
    id: string;
    /** Qual modo vibe esse step pertence (undefined = shared) */
    mood?: OnboardingMood;
    /** Título do card — pode referenciar onboardingCopy[key] */
    title: string;
    /** Corpo do card — pode referenciar onboardingCopy[key] */
    body: string;
    /** Seletor CSS do elemento a destacar (halo leve) */
    target?: string;
    /** Call-to-action opcional (ação real ou link) */
    cta?: OnboardingCTA;
    /** Tom afetivo do step — orienta micro-animação / estilo */
    tone?: OnboardingTone;
    /** Chave do onboarding.copy.ts para rastrear easter eggs no step */
    easterEggKey?: string;
}

export interface OnboardingTour {
    /** Identificador único do tour */
    key: string;
    /** Versão semântica do conteúdo — novo valor = re-exibe para usuários anteriores */
    version: string;
    /** Rotas em que este tour é exibido (pathname exato) */
    routes: string[];
    /** Mood padrão — pode ser sobrescrito por query param ?mood= */
    defaultMood?: OnboardingMood;
    /** Steps do tour */
    steps: OnboardingStep[];
}

// ── Tours ──────────────────────────────────────────────────────────────────

export const onboardingTours: OnboardingTour[] = [
    // ┌─────────────────────────────────────────────────────────────────────┐
    // │  COCKPIT  — tour principal                                          │
    // └─────────────────────────────────────────────────────────────────────┘
    {
        key: "cockpit.v1",
        version: "1.0.0",
        routes: ["/cockpit"],
        defaultMood: "ease",
        steps: [
            {
                id: "cockpit-welcome",
                mood: undefined, // shared — aparece em ambos os modos
                title: "Bem-vindo ao CONDSTORE OS",
                body: onboardingCopy.EASTER_EGG_EASE_TAGLINE_1,
                tone: "delight",
                easterEggKey: "EASTER_EGG_EASE_TAGLINE_1",
            },
            {
                id: "cockpit-clarity",
                mood: "clarity",
                title: "Sem entrelinhas",
                body: onboardingCopy.EASTER_EGG_CLARITY_BODY_1,
                tone: "clarity",
                easterEggKey: "EASTER_EGG_CLARITY_BODY_1",
            },
            {
                id: "cockpit-ease-charm",
                mood: "ease",
                title: "Tudo flui",
                body: onboardingCopy.EASTER_EGG_EASE_BODY_1,
                tone: "reliability",
                easterEggKey: "EASTER_EGG_EASE_BODY_1",
            },
            {
                id: "cockpit-finops-preview",
                mood: undefined,
                title: "FinOps: proteção antes do limite",
                body: "Preventivo → Econômico → Bloqueio. Cada estado tem motivo e próximo passo.",
                tone: "reliability",
                target: "[data-finops-card]",
            },
            {
                id: "cockpit-simulate-cta",
                mood: undefined,
                title: "Veja em tempo real",
                body: "Simule um cenário de consumo e veja como o sistema reage.",
                tone: "call-to-action",
                cta: {
                    label: "Ver simulação",
                    action: "OPEN_SIMULATE",
                },
            },
            {
                id: "cockpit-frank-clarity",
                mood: "clarity",
                title: "Tem dúvida? Fala.",
                body: onboardingCopy.EASTER_EGG_FRANK_BODY,
                tone: "trust",
                easterEggKey: "EASTER_EGG_FRANK_BODY",
                cta: {
                    label: onboardingCopy.EASTER_EGG_FRANK_CTA_LABEL,
                    action: "OPEN_FRANK",
                },
            },
            {
                id: "cockpit-wrap",
                mood: undefined,
                title: "Pronto.",
                body: onboardingCopy.EASTER_EGG_EASE_WRAP_1,
                tone: "delight",
                easterEggKey: "EASTER_EGG_EASE_WRAP_1",
            },
        ],
    },

    // ┌─────────────────────────────────────────────────────────────────────┐
    // │  FINOPS  — tour de aprofundamento                                   │
    // └─────────────────────────────────────────────────────────────────────┘
    {
        key: "finops.v1",
        version: "1.0.0",
        routes: ["/cockpit/finops", "/cockpit/finops/alerts"],
        defaultMood: "clarity",
        steps: [
            {
                id: "finops-welcome",
                mood: undefined,
                title: "FinOps — Controle orçamentário",
                body: onboardingCopy.EASTER_EGG_FINOPS_CLARITY_BODY,
                tone: "reliability",
                easterEggKey: "EASTER_EGG_FINOPS_CLARITY_BODY",
            },
            {
                id: "finops-states",
                mood: "clarity",
                title: "Três estados, zero surpresa",
                body: "PREVENTIVO: aviso antecipado. ECONÔMICO: modo de economia ativo. BLOQUEIO: limite atingido.",
                tone: "clarity",
            },
            {
                id: "finops-ease-tag",
                mood: "ease",
                title: "Fica tranquilo",
                body: onboardingCopy.EASTER_EGG_FINOPS_EASE_TAG,
                tone: "delight",
                easterEggKey: "EASTER_EGG_FINOPS_EASE_TAG",
            },
            {
                id: "finops-simulate-cta",
                mood: undefined,
                title: "Teste antes de acontecer",
                body: "Simule um cenário e veja como o sistema protege seu budget.",
                tone: "call-to-action",
                cta: {
                    label: "Simular agora",
                    action: "OPEN_SIMULATE",
                },
            },
            {
                id: "finops-wrap",
                mood: undefined,
                title: "Você tem controle.",
                body: onboardingCopy.EASTER_EGG_CLARITY_WRAP_1,
                tone: "trust",
                easterEggKey: "EASTER_EGG_CLARITY_WRAP_1",
            },
        ],
    },

    // ┌─────────────────────────────────────────────────────────────────────┐
    // │  EVOLUTION  — tour de timeline                                      │
    // └─────────────────────────────────────────────────────────────────────┘
    {
        key: "evolution.v1",
        version: "1.0.0",
        routes: ["/evolution"],
        defaultMood: "ease",
        steps: [
            {
                id: "evolution-welcome",
                mood: undefined,
                title: "A jornada do CONDSTORE OS",
                body: onboardingCopy.EASTER_EGG_EVOLUTION_EASE_TAG,
                tone: "delight",
                easterEggKey: "EASTER_EGG_EVOLUTION_EASE_TAG",
            },
            {
                id: "evolution-clarity",
                mood: "clarity",
                title: "Transparência total",
                body: onboardingCopy.EASTER_EGG_EVOLUTION_CLARITY_BODY,
                tone: "clarity",
                easterEggKey: "EASTER_EGG_EVOLUTION_CLARITY_BODY",
            },
            {
                id: "evolution-cta",
                mood: undefined,
                title: "O que vem a seguir",
                body: "Veja o roadmap e os próximos marcos do produto.",
                tone: "call-to-action",
                cta: {
                    label: "Ver Roadmap",
                    href: "/evolution/roadmap",
                },
            },
        ],
    },
];

// ── Helper ─────────────────────────────────────────────────────────────────

/**
 * Retorna o tour correspondente ao pathname (match exato).
 * Retorna null se não houver tour cadastrado para a rota.
 */
export function getTourForPath(pathname: string): OnboardingTour | null {
    return (
        onboardingTours.find((tour) =>
            tour.routes.some((route) => route === pathname)
        ) ?? null
    );
}

/**
 * Filtra steps do tour de acordo com o mood ativo.
 * Steps sem mood explícito (undefined) sempre aparecem.
 */
export function filterStepsByMood(
    steps: OnboardingStep[],
    mood: OnboardingMood
): OnboardingStep[] {
    return steps.filter((step) => step.mood === undefined || step.mood === mood);
}
