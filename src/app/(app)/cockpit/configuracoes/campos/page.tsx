import React from 'react';
import { PageHeader } from '@/ui/components/PageHeader';
import { CustomFieldEditor } from '@/ui/cockpit/custom-fields/custom-field-editor';

export default function CustomFieldsPage() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <PageHeader 
                title="Campos Customizáveis" 
                subtitle="Crie campos dinâmicos e estenda as entidades de negócio como Clientes, Pedidos, Conversas e Envios."
            />
            <div className="mt-8">
                <CustomFieldEditor />
            </div>
        </div>
    );
}
