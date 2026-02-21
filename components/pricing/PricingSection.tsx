"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { track } from "../../utils/track"
import { Section } from "../../ui/primitives/Section"
import { Stack } from "../../ui/primitives/Stack"
import { PlanCard } from "./PlanCard"
import { StickyCTA } from "./StickyCTA"
import { planData } from "./planData"

export const PricingSection = () => {
    // Simple state to track selected plan for CTA dynamics
    const [selectedPlanId, setSelectedPlanId] = useState<string>("premium")

    const selectedPlan = planData.find(p => p.id === selectedPlanId) || planData[0]

    useEffect(() => {
        track("pricing_view")
    }, [])

    const handleSelectPlan = (planId: string) => {
        setSelectedPlanId(planId)
        track("plan_select", { plan: planId })
    }

    const handleCTAPress = () => {
        track("checkout_start", { plan: selectedPlanId })
        // Analytics/Checkout integration would go here
        console.log(`Proceeding to checkout with plan: ${selectedPlanId}`)
    }

    return (
        <div className="relative pb-24">
            <Section>
                <Stack space={32}>
                    {/* ENTRADA */}
                    <div className="text-center pt-8">
                        <h1 className="text-[var(--text-hero)] font-bold text-[var(--brand-black)] leading-tight tracking-tight mb-4">
                            Planos do seu jeito
                        </h1>
                        <p className="text-[var(--text-secondary)] text-[var(--text-muted)] max-w-[280px] mx-auto">
                            Escolha a melhor opção para a escala atual da sua operação.
                        </p>
                    </div>

                    {/* PROVA / CARDS */}
                    <Stack space={24}>
                        {planData.map(plan => (
                            <PlanCard
                                key={plan.id}
                                plan={plan}
                                isSelected={selectedPlanId === plan.id}
                                onSelect={() => handleSelectPlan(plan.id)}
                            />
                        ))}
                    </Stack>
                </Stack>
            </Section>

            {/* AÇÃO */}
            <StickyCTA
                buttonLabel={`Assinar o ${selectedPlan.name}`}
                onPress={handleCTAPress}
            />
        </div>
    )
}
