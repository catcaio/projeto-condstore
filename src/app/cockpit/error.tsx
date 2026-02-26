'use client';

import { useEffect } from 'react';
import { AlertCircle, RotateCw } from 'lucide-react';
import { Card, CardContent } from '@/ui/components/card';

export default function CockpitError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Cockpit Global Error:', error);
    }, [error]);

    const requestId = error.digest || 'N/A';

    return (
        <div className="flex h-[80vh] w-full items-center justify-center p-6 os-root">
            <Card variant="elevated" className="w-full max-w-md border-red-500/20 bg-red-500/5 shadow-[0_16px_50px_-24px_rgba(239,68,68,0.2)]">
                <CardContent className="flex flex-col items-center p-10 text-center">
                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                        <AlertCircle className="h-6 w-6" />
                    </div>
                    <h2 className="mb-2 text-xl font-semibold tracking-tight text-[hsl(var(--ui-text))]">Erro no Cockpit</h2>
                    <p className="mb-6 text-sm text-[hsl(var(--ui-text-muted))]">
                        Ocorreu um erro inesperado ao carregar esta parte do sistema.
                    </p>

                    {requestId && requestId !== 'N/A' && (
                        <div className="mb-6 w-full rounded-md bg-[hsl(var(--ui-muted))] p-3 text-left">
                            <p className="text-xs font-mono text-[hsl(var(--ui-text-muted))]">Request ID: {requestId}</p>
                        </div>
                    )}

                    <button
                        onClick={reset}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[hsl(var(--ui-text))] px-4 text-sm font-medium text-[hsl(var(--ui-bg))] transition-colors hover:bg-[hsl(var(--ui-text-muted))]"
                    >
                        <RotateCw className="h-4 w-4" />
                        Tentar novamente
                    </button>
                </CardContent>
            </Card>
        </div>
    );
}
