import { headers } from 'next/headers';
import { SettingsPage, SettingsSection } from '@/ui/settings';
import { AskForm } from './components/ask-form';

export default async function KnowledgeAskPage() {
    const headersList = await headers();
    const role = headersList.get('x-auth-role');

    return (
        <SettingsPage
            title="Frank Ask"
            description="Consulte sua base de conhecimento indexada. (MVP Grounded Generation)"
        >
            <SettingsSection title="Nova Consulta">
                <AskForm />
            </SettingsSection>
        </SettingsPage>
    );
}
