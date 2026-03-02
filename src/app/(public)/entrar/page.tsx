import { Metadata } from 'next';
import { SlugEntryForm } from './slug-entry-form';

export const metadata: Metadata = {
    title: 'Acesso de Funcionário | CondStore',
    description: 'Informe a sigla da loja para prosseguir.',
};

export default function EmployeeEntryPromptPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[hsl(var(--ui-background))]">
            <SlugEntryForm
                title="Acesso da Operação"
                description="Informe o identificador da loja (slug) para acessar o portal do funcionário."
                targetPathPattern="/t/[slug]/entrar"
                type="employee"
            />
        </div>
    );
}
