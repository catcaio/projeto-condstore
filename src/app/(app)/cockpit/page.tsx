import { redirect } from 'next/navigation';

export default async function CockpitLauncherPage() {
    // Legacy launcher route kept only for compatibility.
    // Canonical internal cockpit experience lives in /dashboard.
    redirect('/dashboard');
}
