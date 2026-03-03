import Link from 'next/link';
import { HelpCircle } from 'lucide-react';
import { Card, CardContent } from '@/ui/components/card';

export default function CockpitNotFound() {
    return (
        <div className="flex h-[80vh] w-full items-center justify-center p-6 os-root">
            <Card variant="elevated" className="w-full max-w-md border-dashed border-[hsl(var(--ui-border)/0.9)] bg-[hsl(var(--ui-surface))] shadow-[0_16px_50px_-24px_hsl(var(--ui-shadow)/0.55)]">
                <CardContent className="flex flex-col items-center p-10 text-center">
                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--ui-muted))] text-[hsl(var(--ui-text-muted))]">
                        <HelpCircle className="h-6 w-6" />
                    </div>
                    <h2 className="mb-2 text-xl font-semibold tracking-tight text-[hsl(var(--ui-text))]">Página não encontrada</h2>
                    <p className="mb-6 text-sm text-[hsl(var(--ui-text-muted))]">
                        O recurso ou módulo que você está procurando não existe ou não está acessível no momento.
                    </p>
                    <Link
                        href="/cockpit"
                        className="inline-flex h-10 items-center justify-center rounded-xl bg-[hsl(var(--ui-text))] px-4 text-sm font-medium text-[hsl(var(--ui-bg))] transition-colors hover:bg-[hsl(var(--ui-text-muted))]"
                    >
                        Voltar ao Início
                    </Link>
                </CardContent>
            </Card>
        </div>
    );
}
