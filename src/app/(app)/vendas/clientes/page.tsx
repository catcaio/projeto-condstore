import { redirect } from 'next/navigation';

export const metadata = {
    title: 'Clientes — Vendas',
};

export default function VendasClientesPage() {
    redirect('/clientes');
}
