import React from 'react';
import OrderDetailClient from './order-detail.client';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Detalhes do Pedido | Condstore OS',
};

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    return (
        <React.Fragment>
            <div className="flex h-full flex-col">
                <header className="border-b border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg))] px-6 py-4">
                    <h1 className="text-xl font-semibold uppercase">Pedido Logístico #{id.slice(0, 8)}</h1>
                    <p className="text-sm text-[hsl(var(--ui-text-muted))]">Visão detalhada do pedido e tracking</p>
                </header>
                <main className="flex-1 overflow-y-auto bg-[hsl(var(--ui-bg-subtle))] p-6">
                    <OrderDetailClient orderId={id} />
                </main>
            </div>
        </React.Fragment>
    );
}
