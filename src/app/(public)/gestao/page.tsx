import { Metadata } from 'next';
import { SlugEntryForm } from '../entrar/slug-entry-form';

export const metadata: Metadata = {
    title: 'Acesso de Gestão | CondStore',
    description: 'Informe a sigla da loja para acessar o painel administrativo.',
};

export default function ManagerEntryPromptPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[hsl(var(--ui-background))]">
            <SlugEntryForm
                title="Acesso de Gestão"
                description="Informe o identificador da loja (slug) para acessar o portal do gestor."
                targetPathPattern="/t/[slug]/gestao/entrar"
                type="manager"
            />
        </div>
    );
}
