'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/ui/components/button';

const inputClass = 'mt-1 min-h-11 w-full min-w-0 rounded-lg border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] px-3 py-2 text-sm text-[hsl(var(--ui-text))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]';

export function WorkspaceConfiguration({ operationName, workspaceId, workspaceName }: {
    operationName: string; workspaceId: string | null; workspaceName: string | null;
}) {
    const router = useRouter();
    const [pending, setPending] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    async function configure(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setPending(true);
        setMessage(null);
        try {
            const response = await fetch('/api/cockpit/gestao-ecommerce', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'configure', operationName: String(form.get('operationName') || '').trim(),
                    workspace: { id: String(form.get('workspaceId') || '').trim(), name: String(form.get('workspaceName') || '').trim() },
                }),
            });
            if (!response.ok) {
                setMessage(response.status === 401 || response.status === 403 ? 'Sua sessão não permite configurar a operação.' : 'Não foi possível salvar a configuração. Confira os campos e tente novamente.');
                return;
            }
            setMessage('Configuração salva. A verificação da origem e a sincronização permanecem pendentes.');
            router.refresh();
        } catch {
            setMessage('Não foi possível acessar o servidor. Tente novamente.');
        } finally {
            setPending(false);
        }
    }

    return <details className="min-w-0 rounded-2xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-5">
        <summary className="cursor-pointer text-sm font-semibold">Configuração administrativa</summary>
        <p className="mt-3 text-sm leading-6 text-[hsl(var(--ui-text-muted))]">Identifique a operação e o workspace autorizado para este tenant. A sincronização será habilitada após a aprovação da próxima etapa.</p>
        <form className="mt-4 space-y-4" onSubmit={configure}>
            <fieldset disabled={pending} className="grid min-w-0 gap-4 sm:grid-cols-2">
                <legend className="sr-only">Origem das informações de gestão</legend>
                <label className="min-w-0 text-sm font-medium sm:col-span-2">Nome da operação<input className={inputClass} type="text" name="operationName" defaultValue={operationName} maxLength={255} required autoComplete="off" /></label>
                <label className="min-w-0 text-sm font-medium">ID do workspace ClickUp<input className={inputClass} type="text" name="workspaceId" defaultValue={workspaceId || ''} maxLength={36} pattern="[0-9]+" inputMode="numeric" required autoComplete="off" /></label>
                <label className="min-w-0 text-sm font-medium">Nome do workspace<input className={inputClass} type="text" name="workspaceName" defaultValue={workspaceName || ''} maxLength={255} required autoComplete="off" /></label>
            </fieldset>
            <Button type="submit" variant="secondary" disabled={pending}>{pending ? 'Salvando configuração…' : 'Salvar configuração'}</Button>
            {message && <p role="status" className="text-sm leading-6">{message}</p>}
        </form>
    </details>;
}
