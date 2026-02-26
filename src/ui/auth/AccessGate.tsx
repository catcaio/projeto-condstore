'use client';

import { ReactNode } from 'react';
import { Card, CardContent } from '@/ui/components';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { useEntitlements, canAccess, Module } from './entitlements';

export function AccessGate({
    allow,
    reason,
    children
}: {
    allow: boolean;
    reason: 'plan' | 'rbac';
    children: ReactNode;
}) {
    if (allow) return <>{children}</>;

    const cta = reason === 'plan' ? (
        <Link href="/billing/manage" className="mt-6 inline-flex min-h-10 items-center justify-center rounded-xl bg-[hsl(var(--ui-accent-blue))] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a56cc] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            Fazer Upgrade
        </Link>
    ) : (
        <div className="mt-6 inline-block rounded-lg bg-[hsl(var(--ui-muted))] px-4 py-2 text-sm font-medium text-[hsl(var(--ui-text-muted))]">
            Fale com o administrador
        </div>
    );

    const title = reason === 'plan' ? 'Plano necessário' : 'Sem permissão';
    const description = reason === 'plan'
        ? 'Este recurso premium ajuda você a escalar sua operação. Faça upgrade para desbloquear.'
        : 'Seu usuário atual não possui papel (role) elevado para visualizar este conteúdo.';

    return (
        <div className="flex px-4 py-16 items-center justify-center min-h-[50vh]">
            <Card variant="elevated" className="w-full max-w-md text-center border-dashed">
                <CardContent className="pt-10 pb-10">
                    <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--ui-muted))] text-[hsl(var(--ui-text-muted))] ring-8 ring-[hsl(var(--ui-bg))]">
                        <Lock className="h-6 w-6" />
                    </div>
                    <h2 className="mb-2 text-xl font-semibold tracking-tight text-[hsl(var(--ui-text))]">{title}</h2>
                    <p className="text-sm text-[hsl(var(--ui-text-muted))] px-4 mb-2">{description}</p>
                    {cta}
                </CardContent>
            </Card>
        </div>
    );
}

export function ModuleGate({ moduleName, children }: { moduleName: Module; children: ReactNode }) {
    const auth = useEntitlements();
    const allow = canAccess(moduleName, auth);

    let reason: 'plan' | 'rbac' = 'rbac';
    if (moduleName === 'cockpit' || moduleName === 'acquisition' || moduleName === 'frete') {
        reason = auth.hasActivePlan ? 'rbac' : 'plan';
    }

    return (
        <AccessGate allow={allow} reason={reason}>
            {children}
        </AccessGate>
    );
}
