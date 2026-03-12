import React from 'react';
import OrdersClient from './orders.client';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Pedidos Operacionais | Condstore OS',
};

export default function OrdersPage() {
    return (
        <React.Fragment>
            <div className="flex h-full flex-col">
                <header className="border-b border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg))] px-6 py-4">
                    <h1 className="text-xl font-semibold">Pedidos Logísticos</h1>
                    <p className="text-sm text-[hsl(var(--ui-text-muted))]">Organize e acompanhe o andamento dos pedidos confirmados.</p>
                </header>
                <main className="flex-1 overflow-hidden bg-[hsl(var(--ui-bg-subtle))] p-6">
                    <OrdersClient />
                </main>
            </div>
        </React.Fragment>
    );
}
