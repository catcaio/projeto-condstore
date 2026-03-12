import { PlaybooksClient } from './playbooks.client';
import { getServerSessionUser } from '@/infra/auth/session';

export const metadata = {
    title: 'Frank Playbooks | CONDSTORE',
};

export default async function FrankPlaybooksPage() {
    const session = await getServerSessionUser();
    if (!session) return <div>Unauthorized</div>;

    return (
        <div className="w-full max-w-6xl mx-auto py-8 px-4 md:px-6">
            <PlaybooksClient />
        </div>
    );
}
