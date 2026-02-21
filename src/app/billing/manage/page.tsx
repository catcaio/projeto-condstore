"use client";

import React from 'react';
import { Section } from '../../../../ui/primitives/Section';
import { Card } from '../../../../ui/primitives/Card';
import { Stack } from '../../../../ui/primitives/Stack';
import { Button } from '../../../../ui/primitives/Button';
import { track } from '../../../../utils/track';

export default function ManageBillingPage() {
    const [isLoading, setIsLoading] = React.useState(false);

    const handleOpenPortal = async () => {
        setIsLoading(true);
        track('billing_portal_open');

        try {
            const res = await fetch('/api/billing/portal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!res.ok) {
                throw new Error('Failed to create portal session');
            }

            const { url } = await res.json();
            window.location.href = url;
        } catch (error: any) {
            console.error(error);
            track('billing_portal_error', { error: error.message });
            alert("Erro ao abrir portal de pagamentos. Tente novamente mais tarde.");
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--surface-base)] pb-[env(safe-area-inset-bottom,24px)]">
            <Section>
                <div className="pt-8 pb-4">
                    <h1 className="text-[var(--text-hero)] font-bold text-[var(--brand-black)] leading-tight tracking-tight mb-2">
                        Gerenciar Assinatura
                    </h1>
                </div>

                <div className="mt-6">
                    <Card>
                        <Stack space={16}>
                            <p className="text-[var(--text-muted)]">
                                Você será redirecionado para o portal do cliente seguro gerido pelo nosso parceiro de pagamentos, onde poderá atualizar seu método de pagamento, alterar ou cancelar o seu plano atual.
                            </p>
                            <div className="pt-4">
                                <Button
                                    variant="primary"
                                    className="w-full justify-center h-[56px] relative"
                                    onClick={handleOpenPortal}
                                    disabled={isLoading}
                                >
                                    <span className={`transition-opacity ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
                                        Abrir Portal de Pagamentos
                                    </span>
                                    {isLoading && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        </div>
                                    )}
                                </Button>
                                <div className="mt-4 text-center">
                                    <a href="/billing" className="text-[var(--text-muted)] hover:text-[var(--brand-blue)] font-medium underline text-sm">
                                        Voltar
                                    </a>
                                </div>
                            </div>
                        </Stack>
                    </Card>
                </div>
            </Section>
        </div>
    );
}
