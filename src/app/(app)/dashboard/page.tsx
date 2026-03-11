import { redirect } from 'next/navigation';

export const metadata = {
    title: 'Dashboard — CONDSTORE OS',
};

export default function DashboardPage() {
    redirect('/cockpit');
}
