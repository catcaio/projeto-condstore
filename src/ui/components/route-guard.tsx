'use client';

import * as React from 'react';
import { useSession } from '../context/SessionContext';
import { MODULES, type ModuleConfig } from '../../config/modules';
import { findModuleForPath as resolveModuleForPath, isModuleAuthorized as resolveModuleAuthorization } from '../../config/rbac';
import { usePathname } from 'next/navigation';
import { Card, CardHeader, CardContent } from './card';
import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export function findModuleForPath(pathname: string): ModuleConfig | undefined {
    return resolveModuleForPath(pathname);
}

export function isModuleAuthorized(mod: ModuleConfig, role: string, hasPlan: boolean): { authorized: boolean, reason: 'role' | 'plan' | 'ok' } {
    return resolveModuleAuthorization(mod, role, hasPlan);
}

export function RouteGuard({ children, moduleId }: { children: React.ReactNode, moduleId?: string }) {
    const session = useSession();
    const pathname = usePathname();

    let mod: ModuleConfig | undefined;
    if (moduleId) {
        mod = MODULES.find(m => m.id === moduleId);
    } else {
        mod = findModuleForPath(pathname);
    }

    if (!mod) {
        // Fail-closed policy for unregistered (orphaned) routes
        return (
            <div className="flex w-full mt-12 justify-center px-4">
                <Card className="max-w-md w-full text-center border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] shadow-sm">
                    <CardHeader>
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--ui-danger)/0.1)] mb-4">
                            <ShieldAlert className="h-6 w-6 text-[hsl(var(--ui-danger))]" />
                        </div>
                        <div className="text-lg font-bold text-[hsl(var(--ui-text))]">
                            Módulo Não Registrado
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-[hsl(var(--ui-text-muted))] mb-6">
                            Esta rota não está mapeada no registro oficial do sistema. O acesso foi bloqueado por segurança (Fail-Closed Policy).
                        </p>

                        <div className="flex justify-center">
                            <Link
                                href="/cockpit"
                                className="inline-flex h-9 items-center justify-center rounded-[var(--radius-button)] border border-[hsl(var(--ui-border))] bg-transparent px-4 text-sm font-medium text-[hsl(var(--ui-text))] transition-colors hover:bg-[hsl(var(--ui-muted))] focus-visible:outline-none"
                            >
                                Voltar ao Início
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const { authorized, reason } = isModuleAuthorized(mod, session.role, session.hasActivePlan);

    if (authorized) {
        return <>{children}</>;
    }

    // Reactively log to some audit sink in the future, for now just block render.

    return (
        <div className="flex w-full mt-12 justify-center px-4">
            <Card className="max-w-md w-full text-center border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] shadow-sm">
                <CardHeader>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--ui-danger)/0.1)] mb-4">
                        <ShieldAlert className="h-6 w-6 text-[hsl(var(--ui-danger))]" />
                    </div>
                    <div className="text-lg font-bold text-[hsl(var(--ui-text))]">
                        {reason === 'plan' ? 'Plano necessário' : 'Sem permissão'}
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-[hsl(var(--ui-text-muted))] mb-6">
                        {reason === 'plan'
                            ? 'Este módulo requer um plano ativo superior. Atualize agora para liberar novos recursos.'
                            : 'Você não tem as permissões necessárias para visualizar este módulo. Contate o administrador.'}
                    </p>

                    <div className="flex justify-center">
                        {reason === 'plan' ? (
                            <Link
                                href="/billing"
                                className="inline-flex h-9 items-center justify-center rounded-[var(--radius-button)] bg-[hsl(var(--ui-accent-blue))] px-4 text-sm font-medium text-white transition-colors hover:bg-[hsl(var(--ui-accent-blue-strong))] focus-visible:outline-none"
                            >
                                Atualizar Plano
                            </Link>
                        ) : (
                            <Link
                                href="/cockpit"
                                className="inline-flex h-9 items-center justify-center rounded-[var(--radius-button)] border border-[hsl(var(--ui-border))] bg-transparent px-4 text-sm font-medium text-[hsl(var(--ui-text))] transition-colors hover:bg-[hsl(var(--ui-muted))] focus-visible:outline-none"
                            >
                                Voltar ao Início
                            </Link>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
