"use client";

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getOrCreateClientUserId } from '../../../lib/billing/clientUserId';
import { fetchSubscription } from '../../../lib/billing/getSubscription';
import { track } from '../../../../utils/track';
import { Section } from '../../../../ui/primitives/Section';
import { Card } from '../../../../ui/primitives/Card';
import { Button } from '../../../../ui/primitives/Button';
import { Stack } from '../../../../ui/primitives/Stack';

const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
const SpinnerIcon = () => <svg className="animate-spin h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;

function BillingSuccessInner() {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get('session_id');
    const [isActivated, setIsActivated] = useState(false);
    const [pollingCount, setPollingCount] = useState(0);
    const pollingRef = useRef(false);

    useEffect(() => {
        track("checkout_success_view", { session_id: sessionId });

        const pollIntervals = [2000, 3000, 5000, 8000, 12000]; // 30s total config sequence

        const pollSubscription = async (attempt = 0) => {
            if (isActivated || pollingRef.current) return;
            pollingRef.current = true;

            try {
                const userId = getOrCreateClientUserId();
                const sub = await fetchSubscription();

                if (sub && 'status' in sub && ['active', 'trialing'].includes(sub.status)) {
                    setIsActivated(true);
                    track("subscription_activated", { plan: (sub as any).planId });
                    return;
                }
            } catch (err) {
                console.error("Polling error", err);
            }

            pollingRef.current = false;

            if (attempt < pollIntervals.length) {
                setTimeout(() => {
                    setPollingCount(attempt + 1);
                    pollSubscription(attempt + 1);
                }, pollIntervals[attempt]);
            }
        };

        pollSubscription(0);
    }, [isActivated, sessionId]);

    return (
        <div className="min-h-screen bg-[var(--surface-base)] flex items-center justify-center p-4">
            <Section>
                <Card className="max-w-md mx-auto text-center border-green-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
                    <Stack space={24}>
                        <div className="flex justify-center pt-4">
                            <CheckCircleIcon />
                        </div>

                        <div>
                            <h1 className="text-[var(--text-hero)] font-bold text-[var(--brand-black)] mb-2">
                                Pagamento Confirmado
                            </h1>
                            <p className="text-[var(--text-secondary)] text-[var(--text-muted)]">
                                Seu pagamento foi recebido com sucesso.
                            </p>
                        </div>

                        {!isActivated ? (
                            <div className="bg-green-50 rounded-[var(--radius-card)] p-4 flex items-center justify-center gap-3 border border-green-100">
                                <SpinnerIcon />
                                <span className="text-green-800 font-medium text-[var(--text-base)]">
                                    Ativando assinatura... ({pollingCount + 1}/5)
                                </span>
                            </div>
                        ) : (
                            <div className="bg-green-50 rounded-[var(--radius-card)] p-4 border border-green-100">
                                <p className="text-green-800 font-medium tracking-tight">
                                    Sua assinatura foi ativada e já está pronta para uso!
                                </p>
                            </div>
                        )}

                        <div className="pt-2 transition-all duration-500" style={{ opacity: isActivated ? 1 : 0.5, pointerEvents: isActivated ? 'auto' : 'none' }}>
                            <Button
                                variant="primary"
                                className="w-full justify-center h-[56px]"
                                onClick={() => window.location.href = '/billing'}
                            >
                                Continuar
                            </Button>
                        </div>
                    </Stack>
                </Card>
            </Section>
        </div>
    );
}

export default function BillingSuccessPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[var(--surface-base)] flex items-center justify-center p-4">Carregando...</div>}>
            <BillingSuccessInner />
        </Suspense>
    );
}
