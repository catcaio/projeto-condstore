import Link from 'next/link';
import { Button } from '@/ui/components';
import { SearchX } from 'lucide-react';

export default function TenantNotFoundPage() {
    return (
        <div className="flex min-h-[80vh] flex-col items-center justify-center py-12 px-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[hsl(var(--ui-danger)/0.1)] text-[hsl(var(--ui-danger))] mb-6">
                <SearchX className="h-8 w-8" />
            </div>

            <h1 className="text-2xl font-bold text-[hsl(var(--ui-text))] mb-2">
                Loja não encontrada
            </h1>

            <p className="text-[hsl(var(--ui-text-muted))] max-w-sm mb-8">
                Não conseguimos localizar nenhuma operação com este identificador. Verifique a URL e tente novamente.
            </p>

            <Link href="/" passHref legacyBehavior>
                <Button variant="secondary">
                    Voltar para o Início
                </Button>
            </Link>
        </div>
    );
}
