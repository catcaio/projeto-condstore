import Link from 'next/link';
import { Button } from '@/ui/components/button';
import { AlertTriangle } from 'lucide-react';

export default function CarrierNotFound() {
    return (
        <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
            <AlertTriangle className="w-16 h-16 text-[hsl(var(--ui-text-muted))]" />
            <div className="space-y-2">
                <h1 className="text-2xl font-bold text-[hsl(var(--ui-text))]">
                    Transportadora não encontrada
                </h1>
                <p className="text-sm text-[hsl(var(--ui-text-muted))] max-w-md">
                    A transportadora solicitada não existe ou não está cadastrada neste lojista.
                    Verifique a URL ou volte para a lista de tabelas de frete.
                </p>
            </div>
            <Link href="/logistica/tabelas-frete" passHref>
                <Button variant="secondary">Voltar para Tabelas de Frete</Button>
            </Link>
        </div>
    );
}
