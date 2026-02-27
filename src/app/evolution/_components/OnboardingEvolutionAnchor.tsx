"use client";
/**
 * OnboardingEvolutionAnchor.tsx
 * Client wrapper do OnboardingAnchor para a página de Evolution.
 *
 * Recebe tenantId/userId como props vindos do Server Component (page.tsx).
 * Usa pathname hardcoded pois este componente é exclusivo da rota /evolution.
 */

import { OnboardingAnchor } from "@/modules/onboarding";

interface Props {
    tenantId: string;
    userId?: string | null;
}

export function OnboardingEvolutionAnchor({ tenantId, userId }: Props) {
    return (
        <OnboardingAnchor
            pathname="/evolution"
            tenantId={tenantId}
            userId={userId}
        />
    );
}
