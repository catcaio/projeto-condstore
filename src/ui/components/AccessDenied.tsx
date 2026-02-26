import { Lock } from 'lucide-react';

export default function AccessDenied() {
    return (
        <div className="flex px-4 py-16 items-center justify-center min-h-[50vh]">
            <div className="w-full max-w-md text-center border border-dashed rounded-[1.2rem] border-[hsl(var(--ui-border)/0.9)] bg-[hsl(var(--ui-surface))] shadow-[0_16px_50px_-24px_hsl(var(--ui-shadow)/0.55)] p-10">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--ui-muted))] text-[hsl(var(--ui-text-muted))]">
                    <Lock className="h-6 w-6" />
                </div>
                <h2 className="mb-2 text-xl font-semibold tracking-tight text-[hsl(var(--ui-text))]">Sem permissão</h2>
                <p className="text-sm text-[hsl(var(--ui-text-muted))] px-4">
                    Seu usuário atual não possui papel (role) elevado para visualizar este conteúdo.
                </p>
                <div className="mt-6 inline-block rounded-lg bg-[hsl(var(--ui-muted))] px-4 py-2 text-sm font-medium text-[hsl(var(--ui-text-muted))]">
                    Fale com o administrador
                </div>
            </div>
        </div>
    );
}
