import { ConfigEditor } from '@/ui/cockpit/config-editor';
import { PageHeader } from '@/ui/components/PageHeader';
import React from 'react';

export default async function CockpitConfigCategoryPage(props: { params: Promise<{ category: string }> }) {
    const { category } = await props.params;

    // Titles based on category mapping
    const titles: Record<string, string> = {
        'pipeline': 'Pipeline de Vendas',
        'transportadoras': 'Gerenciamento de Transportadoras',
        'frete': 'Regras de Frete',
        'playbooks': 'Playbooks do Frank',
        'templates': 'Templates de Atendimento',
        'operacao': 'Configuração de Operação',
        'sla': 'Configurações de SLA',
    };

    const title = titles[category] || `Configurações: ${category}`;
    const description = `Edite as regras dinâmicas e configurações do cockpit. (Categoria: ${category})`;

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <PageHeader title={title} subtitle={description} />
            <div className="mt-8">
                <ConfigEditor category={category} />
            </div>
        </div>
    );
}
