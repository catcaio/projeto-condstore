import { redirect } from 'next/navigation';

export const metadata = {
    title: 'Pedidos — Vendas',
};

export default function VendasPedidosPage() {
    redirect('/pedidos');
}
