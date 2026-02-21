"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { track } from "../../utils/track"
import { Section } from "../../ui/primitives/Section"
import { Stack } from "../../ui/primitives/Stack"
import { PlanCard } from "./PlanCard"
import { StickyCTA } from "./StickyCTA"
import { planData } from "./planData"
import { createCheckoutSession } from "../../src/lib/pricing/checkout"

const ShieldIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>;
const ZapIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>;
const LockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>;

const TrustBlock = () => (
    <div className="flex flex-wrap items-center justify-center gap-3 mt-5 mb-1 text-[var(--text-tertiary)] text-[var(--text-muted)]">
        <span className="flex items-center gap-1"><ZapIcon /> Cancelamento imediato</span>
        <span className="flex items-center gap-1"><ShieldIcon /> Sem fidelidade</span>
        <span className="flex items-center gap-1"><LockIcon /> Pagamento seguro</span>
    </div>
)

export const PricingSection = () => {
    // Simple state to track selected plan for CTA dynamics
    const [selectedPlanId, setSelectedPlanId] = useState<string>("premium")
    const [showOtherPlans, setShowOtherPlans] = useState(false);
    const [hasScrolledPastPremium, setHasScrolledPastPremium] = useState(false);
    const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

    // refs
    const premiumRef = React.useRef<HTMLDivElement>(null);
    const depth50Ref = React.useRef<HTMLDivElement>(null);
    const depth90Ref = React.useRef<HTMLDivElement>(null);

    const selectedPlan = planData.find(p => p.id === selectedPlanId) || planData[0]

    useEffect(() => {
        track("pricing_view")

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    if (entry.target === premiumRef.current) {
                        track("pricing_anchor_visible");
                        setHasScrolledPastPremium(false);
                    }
                    if (entry.target === depth50Ref.current) {
                        track("pricing_scroll_depth_50");
                    }
                    if (entry.target === depth90Ref.current) {
                        track("pricing_scroll_depth_90");
                    }
                } else {
                    if (entry.target === premiumRef.current && entry.boundingClientRect.y < 0) {
                        setHasScrolledPastPremium(true);
                    }
                }
            });
        }, { threshold: 0.1 });

        if (premiumRef.current) observer.observe(premiumRef.current);
        if (depth50Ref.current) observer.observe(depth50Ref.current);
        if (depth90Ref.current) observer.observe(depth90Ref.current);

        return () => observer.disconnect();
    }, [])

    const handleSelectPlan = (planId: string) => {
        setSelectedPlanId(planId)
        track("plan_select", { plan: planId })
    }

    const handleExpandOptions = () => {
        setShowOtherPlans(true);
        track("pricing_expand_options");
    }

    const handleCTAPress = async () => {
        if (isCheckoutLoading) return;
        setIsCheckoutLoading(true);
        track("checkout_start", { plan: selectedPlanId });

        try {
            // Generate stable anon id if not logged in
            let userId = localStorage.getItem('anon_user_id');
            if (!userId) {
                userId = crypto.randomUUID();
                localStorage.setItem('anon_user_id', userId);
            }

            const checkoutUrl = await createCheckoutSession(selectedPlanId, userId);
            track("checkout_redirect", { plan: selectedPlanId });
            window.location.href = checkoutUrl;
        } catch (error) {
            console.error("Checkout failed:", error);
            track("checkout_error", { plan: selectedPlanId, error: String(error) });
            setIsCheckoutLoading(false);
        }
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
                        <TrustBlock />
                    </div>

                    {/* PROVA / CARDS */}
                    <div className="relative w-full">
                        <Stack space={24}>
                            {/* Premium Card First for Mobile-First Display */}
                            <div ref={premiumRef}>
                                <PlanCard
                                    plan={planData.find(p => p.id === 'premium')!}
                                    isSelected={selectedPlanId === 'premium'}
                                    onSelect={() => handleSelectPlan('premium')}
                                />
                            </div>

                            {!showOtherPlans ? (
                                <button
                                    className="w-full py-4 my-2 text-center text-[var(--brand-blue)] font-medium text-[var(--text-base)] transition-opacity active:opacity-70 bg-transparent border-none cursor-pointer"
                                    onClick={handleExpandOptions}
                                >
                                    Ver outras opções
                                </button>
                            ) : (
                                <div className="flex flex-col gap-[var(--space-3)] animate-in fade-in slide-in-from-top-4 duration-300">
                                    {planData.filter(p => p.id !== 'premium').map(plan => (
                                        <PlanCard
                                            key={plan.id}
                                            plan={plan}
                                            isSelected={selectedPlanId === plan.id}
                                            onSelect={() => handleSelectPlan(plan.id)}
                                        />
                                    ))}
                                </div>
                            )}

                            {selectedPlanId !== 'premium' && (
                                <div className="text-center bg-[var(--surface-muted)] px-4 py-3 rounded-[var(--radius-card)] mt-2 border border-[var(--surface-muted)]">
                                    <p className="text-[var(--text-tertiary)] font-medium text-[var(--text-muted)]">
                                        💡 Plano mais escolhido: <span className="text-[var(--brand-black)] font-bold">Premium</span>
                                    </p>
                                </div>
                            )}
                        </Stack>

                        {/* Scroll depth tracking anchors */}
                        <div ref={depth50Ref} className="absolute top-[50%] left-0 w-full h-1 pointer-events-none opacity-0" />
                        <div ref={depth90Ref} className="absolute top-[90%] left-0 w-full h-1 pointer-events-none opacity-0" />
                    </div>
                </Stack>
            </Section>

            {/* AÇÃO */}
            <StickyCTA
                buttonLabel={`Assinar o ${selectedPlan.name}`}
                onPress={handleCTAPress}
                hasScrolled={hasScrolledPastPremium}
                loading={isCheckoutLoading}
            />
        </div>
    )
}
