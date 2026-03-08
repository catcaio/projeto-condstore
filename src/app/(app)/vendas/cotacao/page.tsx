import { Metadata } from 'next';
import { CotacaoClient } from './cotacao.client';

export const metadata: Metadata = {
    title: 'Nova Cotação — Vendas',
    description: 'Simular cotação de frete para venda',
};

export default function VendasCotacaoPage() {
    return (
        <main className="p-6 md:p-8">
            <CotacaoClient />
        </main>
    );
}
