import type { Metadata } from 'next';
import { PageHeader } from '@/mvp/ui/PageHeader';
import { Card } from '@/mvp/ui/Card';
import { SectionHeader } from '@/mvp/ui/SectionHeader';
import { Badge } from '@/mvp/ui/Badge';

export const metadata: Metadata = {
  title: 'Configurações — MVP | CONDSTORE OS',
  robots: { index: false, follow: false },
};

/**
 * Settings stub — /mvp/app/settings
 * Entry point for tenant, carrier and operator configuration.
 * Full implementation deferred post-MVP core.
 */
export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Configurações"
        subtitle="Tenant, transportadoras, operadores e preferências"
        badge={null}

        breadcrumb={[{ href: '/mvp/app', label: 'Cockpit' }, { label: 'Configurações' }]}
      />

      <div className="space-y-3">
        <SectionHeader label="Seções" title="Áreas de configuração" />
        {SETTING_SECTIONS.map((section) => (
          <Card key={section.title} noPadding>
            <div className="flex items-start justify-between gap-4 p-4">
              <div className="space-y-0.5">
                <p
                  className="text-sm font-medium"
                  style={{ color: 'hsl(var(--mvp-text-1))' }}
                >
                  {section.title}
                </p>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: 'hsl(var(--mvp-text-3))' }}
                >
                  {section.description}
                </p>
              </div>
              {/* Badge removed */}

            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

const SETTING_SECTIONS = [
  {
    title: 'Tenant e organização',
    description: 'Nome, fuso horário, dados de contato e configurações gerais do tenant.',
  },
  {
    title: 'Transportadoras',
    description: 'Ativar, desativar e configurar credenciais de transportadoras integradas.',
  },
  {
    title: 'Operadores',
    description: 'Gerenciar usuários, papéis e permissões dentro do tenant.',
  },
  {
    title: 'WhatsApp',
    description: 'Número de origem Twilio, templates de mensagem e horário de atendimento.',
  },
] as const;
