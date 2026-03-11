import { redirect } from 'next/navigation';

export const metadata = {
    title: 'Home — CONDSTORE OS',
};

export default function HomePage() {
    redirect('/cockpit');
}
