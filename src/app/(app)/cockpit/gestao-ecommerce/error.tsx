'use client';

import { Button } from '@/ui/components/button';

export default function EcommerceCockpitError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return <section role="alert" className="space-y-4 rounded-2xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-6"><h1 className="text-lg font-semibold">Gestão de e-commerce indisponível</h1><p className="text-sm leading-6 text-[hsl(var(--ui-text-muted))]">Não foi possível consultar os registros persistidos. Tente carregar novamente.</p><Button variant="secondary" onClick={reset}>Tentar novamente</Button></section>;
}
