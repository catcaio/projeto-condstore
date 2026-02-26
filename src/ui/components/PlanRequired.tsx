import { Lock } from 'lucide-react';
import Link from 'next/link';

export default function PlanRequired() {
    return (
        <div className="flex px-4 py-16 items-center justify-center min-h-[50vh]">
            <div className="w-full max-w-md text-center border border-dashed rounded-[1.2rem] border-[hsl(var(--ui-border)/0.9)] bg-[hsl(var(--ui-surface))] shadow-[0_16px_50px_-24px_hsl(var(--ui-shadow)/0.55)] p-10">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--ui-muted))] text-[hsl(var(--ui-text-muted))]">
                    <Lock className="h-6 w-6" />
                </div>
                <h2 className="mb-2 text-xl font-semibold tracking-tight text-[hsl(var(--ui-text))]">Plano necessário</h2>
                <p className="text-sm text-[hsl(var(--ui-text-muted))] px-4 mb-2">
                    Este recurso premium ajuda você a escalar sua operação. Faça upgrade para desbloquear.
                </p>
                <Link
                    href="/billing/manage"
                    className="mt-6 inline-flex min-h-10 items-center justify-center rounded-xl bg-[hsl(var(--ui-accent-blue))] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-colors"
                >
                    Fazer Upgrade
                </Link>
            </div>
        </div>
    );
}
