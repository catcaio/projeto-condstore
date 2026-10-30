'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/ui/components/button';

export function SeedDemoButton() {
    const router = useRouter();
    const [pending, setPending] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    async function loadExample() {
        setPending(true);
        setMessage(null);
        try {
            const response = await fetch('/api/cockpit/gestao-ecommerce', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'seed_demo' }),
            });
            if (!response.ok) {
                setMessage(response.status === 401 || response.status === 403 ? 'Sua sessão não permite carregar o exemplo.' : 'Não foi possível carregar o exemplo. Tente novamente.');
                return;
            }
            setMessage('Exemplo demonstrativo salvo. Atualizando a visualização.');
            router.refresh();
        } catch {
            setMessage('Não foi possível acessar o servidor. Tente novamente.');
        } finally {
            setPending(false);
        }
    }

    return <div className="space-y-3"><Button variant="secondary" className="h-auto min-h-11 max-w-full whitespace-normal py-2 text-left" onClick={loadExample} disabled={pending}>{pending ? 'Carregando exemplo…' : 'Carregar exemplo demonstrativo'}</Button><p className="text-xs text-[hsl(var(--ui-text-muted))]">Ação administrativa: grava somente o projeto de demonstração neste tenant. Nenhum dado comercial é criado.</p>{message && <p role="status" className="text-sm">{message}</p>}</div>;
}
