import * as React from "react"
import { Card } from "../../ui/primitives/Card"
import { Stack } from "../../ui/primitives/Stack"
import { Button } from "../../ui/primitives/Button"
import { Pressable } from "../../ui/primitives/Pressable"
import { PricingPlan } from "./planData"
import { track } from "../../utils/track"

const CheckIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="20 6 9 17 4 12"></polyline></svg>
)

const XIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
)

export interface PlanCardProps {
    plan: PricingPlan;
    onSelect?: (planId: string) => void;
    isSelected?: boolean;
}

export const PlanCard = ({ plan, onSelect, isSelected }: PlanCardProps) => {
    return (
        <Pressable
            className="w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-blue)] focus-visible:outline-offset-2 rounded-[var(--radius-card)]"
            onClick={() => onSelect?.(plan.id)}
            aria-pressed={isSelected}
            aria-label={`Selecionar plano ${plan.name}`}
        >
            <Card variant={plan.recommended ? "recommended" : "default"} className={`relative overflow-hidden transition-all ${isSelected ? 'ring-2 ring-[var(--brand-blue)] ring-offset-2 bg-[var(--surface-muted)]' : 'bg-[var(--surface-elevated)]'}`}>

                {plan.recommended && (
                    <div className="absolute top-0 right-0 py-1 px-3 bg-[var(--brand-blue)] text-white text-[var(--text-tertiary)] font-bold rounded-bl-[var(--radius-card)]">
                        A MAIS TESTADA
                    </div>
                )}

                <Stack space={24}>
                    <div>
                        <h3 className="text-[var(--text-primary)] font-semibold text-[var(--brand-black)]">{plan.name}</h3>
                        <p className="text-[var(--text-muted)] mt-1">{plan.description}</p>
                    </div>

                    <div className="flex items-baseline gap-1">
                        <span className="text-[var(--text-hero)] font-bold text-[var(--brand-black)] tracking-tight">{plan.price}</span>
                    </div>

                    <Stack space={16}>
                        {plan.features.map((feature, i) => (
                            <div key={i} className="flex items-center gap-3">
                                {feature.included ? (
                                    <CheckIcon className="w-5 h-5 text-[var(--brand-blue)] shrink-0" />
                                ) : (
                                    <XIcon className="w-5 h-5 text-[var(--text-muted)] opacity-50 shrink-0" />
                                )}
                                <span className={`text-[var(--text-base)] ${feature.included ? 'text-[var(--text-body)]' : 'text-[var(--text-muted)] line-through opacity-70'}`}>
                                    {feature.name}
                                </span>
                            </div>
                        ))}
                    </Stack>

                    {plan.extraDetails.length > 0 && (
                        <details
                            className="group border-t border-[var(--surface-muted)] pt-4 mt-2"
                            onToggle={(e) => {
                                if ((e.target as HTMLDetailsElement).open) {
                                    track("plan_expand_details", { plan: plan.id })
                                }
                            }}
                        >
                            <summary className="text-[var(--brand-blue)] font-medium text-[var(--text-base)] cursor-pointer outline-none list-none flex items-center gap-2 select-none focus-visible:ring-2 focus-visible:ring-[var(--brand-blue)] focus-visible:ring-offset-2 rounded-sm p-1 -ml-1">
                                <span>Ver detalhes</span>
                                <span className="transition-transform group-open:rotate-180">↓</span>
                            </summary>
                            <ul className="mt-4 space-y-2 text-[var(--text-muted)] text-[var(--text-tertiary)] list-disc pl-5">
                                {plan.extraDetails.map((detail, i) => (
                                    <li key={i}>{detail}</li>
                                ))}
                            </ul>
                        </details>
                    )}

                </Stack>
            </Card>
        </Pressable>
    )
}
