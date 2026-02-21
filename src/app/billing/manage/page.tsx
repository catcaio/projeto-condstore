"use client";

import React from 'react';
import { Section } from '../../../../ui/primitives/Section';
import { Card } from '../../../../ui/primitives/Card';
import { Stack } from '../../../../ui/primitives/Stack';
import { Button } from '../../../../ui/primitives/Button';

export default function ManageBillingPage() {
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
                                    className="w-full justify-center h-[56px]"
                                    onClick={() => alert("Portal Stripe integration coming soon.")}
                                >
                                    Abrir Portal de Pagamentos
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
