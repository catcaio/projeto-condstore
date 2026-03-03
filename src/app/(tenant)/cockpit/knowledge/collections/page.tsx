import { headers } from 'next/headers';
import { SettingsPage, SettingsSection } from '@/ui/settings';
import { CollectionsManager } from './components/collections-manager';
import { notFound } from 'next/navigation';

export default async function CollectionsPage() {
    const headersList = await headers();
    const role = headersList.get('x-auth-role');

    if (role !== 'admin' && role !== 'manager') {
        notFound();
    }

    return (
        <SettingsPage
            title="Sincronização Cloud"
            description="Conecte seu Google Drive para injetar automagicamente políticas no Frank."
        >
            <SettingsSection title="Integrações Ativas">
                <CollectionsManager metrics={{}} />
            </SettingsSection>

            <SettingsSection title="Políticas de Sincronização">
                <ul className="list-disc ml-5 text-sm text-[hsl(var(--ui-text-muted))] space-y-2 max-w-2xl pl-4 text-justify">
                    <li>O Connector Google Drive extrai versões delta dos arquivos modificados de cada pasta sincronizada pela conta corporativa.</li>
                    <li>O Frank apenas aceita links das pastas raiz se possuir a permissão adequada no seu portal de OAuth (MVP: Mock Mode).</li>
                    <li>De acordo com o plano, a Sincronização Incremental possui limites Raciocinados diários visando poupar cota Cloud Vetorial (Ver <b>FinOps</b>).</li>
                </ul>
            </SettingsSection>

        </SettingsPage>
    );
}
