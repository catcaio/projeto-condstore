import { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
    title: 'Logs — Sistema',
    description: 'Audit logs do sistema',
};

export default function SistemaLogsPage() {
    redirect('/cockpit/audit');
}
