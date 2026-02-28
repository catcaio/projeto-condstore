import { Suspense } from 'react';
import { headers } from 'next/headers';
import { SettingsPage, SettingsSection, SettingsRow } from '@/ui/settings';
import { Badge } from '@/ui/components';
import {
  Globe, Server, ShieldCheck, Database,
  MessageSquare, Cpu, CreditCard, Box, BookOpen, AlertCircle, Fingerprint, Webhook
} from 'lucide-react';
import { isSuperAdmin } from '@/ui/auth/entitlements-logic';
import { getEnvironmentInfo, getIntegrationsStatus, getTenantBasics } from './queries';
import { ThemeToggle } from '@/ui/theme';
import Link from 'next/link';

export const metadata = {
  title: 'Configurações — Condstore OS',
};

export default async function Settings(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = await props.searchParams;
  const inspectTenantId = typeof searchParams.tenantId === 'string' ? searchParams.tenantId : undefined;

  const headersList = await headers();
  const sessionTenantId = headersList.get('x-auth-tenant-id');
  const role = headersList.get('x-auth-role');

  const actAsSuperAdmin = isSuperAdmin(role) && inspectTenantId;
  const tenantId = actAsSuperAdmin ? inspectTenantId : sessionTenantId;

  if (!tenantId) {
    return <div>Tenant ID não encontrado.</div>;
  }

  const { domain, env, gitSha, stripeEnabled } = getEnvironmentInfo();
  const [integrations, basics] = await Promise.all([
    getIntegrationsStatus(tenantId),
    getTenantBasics(tenantId)
  ]);

  const isRoot = isSuperAdmin(role);

  // Status mappings
  const getStripeBadge = (status: string, enabled: boolean) => {
    if (!enabled) return <Badge variant="muted">Not Configured</Badge>;
    if (status === 'active') return <Badge variant="success">Active</Badge>;
    if (status === 'past_due') return <Badge variant="danger">Past Due</Badge>;
    if (status === 'not_started') return <Badge variant="outline">Not Started</Badge>;
    return <Badge variant="muted">{status}</Badge>;
  };

  return (
    <SettingsPage
      title="Configurações Operacionais"
      description="Painel de controle do ambiente, integrações e sistema"
    >
      <SettingsSection title="Workspace">
        <SettingsRow
          icon={<Box className="h-5 w-5 text-[hsl(var(--ui-text-muted))]" />}
          label="Tenant ID"
          value={<span className="font-mono text-xs">{basics?.id}</span>}
        />
        <SettingsRow
          icon={<Fingerprint className="h-5 w-5 text-[hsl(var(--ui-text-muted))]" />}
          label="Nome do Tenant"
          value={basics?.name ?? 'Desconhecido'}
        />
      </SettingsSection>

      <SettingsSection title="Appearance">
        <SettingsRow
          icon={<Globe className="h-5 w-5 text-[hsl(var(--ui-text-muted))]" />}
          label="Tema Visual"
          description="Escolha entre modo claro ou escuro (Applies instantly)"
          value={<ThemeToggle />}
        />
      </SettingsSection>

      <SettingsSection title="Environment">
        <SettingsRow
          icon={<Globe className="h-5 w-5 text-[hsl(var(--ui-text-muted))]" />}
          label="Ambiente e Domínio"
          description={
            <span className="flex items-center gap-2">
              <span>{domain}</span>
            </span>
          }
          value={<Badge variant={env === 'production' ? 'success' : 'muted'}>{env.toUpperCase()}</Badge>}
        />
        <SettingsRow
          icon={<Server className="h-5 w-5 text-[hsl(var(--ui-text-muted))]" />}
          label="Versão Implantada"
          value={<span className="font-mono text-xs text-[hsl(var(--ui-text-muted))]">{gitSha?.substring(0, 7) || 'local'}</span>}
        />
      </SettingsSection>

      <SettingsSection title="Integrations Status">
        <SettingsRow
          icon={<CreditCard className="h-5 w-5 text-[hsl(var(--ui-text-muted))]" />}
          label="Stripe Billing"
          value={getStripeBadge(integrations.stripe, stripeEnabled)}
        />
        <SettingsRow
          icon={<MessageSquare className="h-5 w-5 text-[hsl(var(--ui-text-muted))]" />}
          label="WhatsApp Twilio"
          value={<Badge variant={integrations.whatsapp ? "success" : "muted"}>{integrations.whatsapp ? "Configured" : "Not Configured"}</Badge>}
        />
        <SettingsRow
          icon={<Cpu className="h-5 w-5 text-[hsl(var(--ui-text-muted))]" />}
          label="AI Providers"
          value={
            integrations.aiProviders > 0
              ? <Badge variant="success">{integrations.aiProviders} Enabled</Badge>
              : <Badge variant="muted">0 Enabled</Badge>
          }
        />
        <SettingsRow
          icon={<Database className="h-5 w-5 text-[hsl(var(--ui-text-muted))]" />}
          label="Banco de Dados e Cache"
          value={
            <Badge variant={integrations.dbOk && integrations.redisOk ? "success" : "danger"}>
              {integrations.dbOk && integrations.redisOk ? "OK" : "Degraded"}
            </Badge>
          }
        />
      </SettingsSection>

      <SettingsSection title="Support">
        <SettingsRow
          icon={<BookOpen className="h-5 w-5 text-[hsl(var(--ui-text-muted))]" />}
          label="Manutenção Operacional"
          description="Em caso de falha de billing ou sistema, contate o administrador root."
          value={
            <a href="https://github.com/catcaio/projeto-condstore" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-[hsl(var(--ui-accent-blue))] hover:underline">
              Runbooks & Docs
            </a>
          }
        />
      </SettingsSection>

      {isRoot && (
        <SettingsSection title="Danger Zone (Superadmin)">
          <div className="p-4 border-l-2 border-[hsl(var(--ui-danger))] bg-[hsl(var(--ui-danger)/0.05)] text-sm mb-4">
            <div className="flex items-center gap-2 font-bold text-[hsl(var(--ui-danger))] mb-1">
              <AlertCircle className="h-4 w-4" /> Root Access Active
            </div>
            <div className="text-[hsl(var(--ui-danger-ink))]">
              As rotas abaixo expõem controles irrestritos sobre o ambiente.
            </div>
          </div>

          <SettingsRow
            icon={<CreditCard className="h-5 w-5 text-[hsl(var(--ui-danger))]" />}
            label={
              <span className="text-[hsl(var(--ui-danger))]">Break-glass Reconcile</span>
            }
            description={
              <span className="font-mono text-xs">/api/internal/billing/reconcile-stripe</span>
            }
            value="Use internal token via CLI"
          />

          <SettingsRow
            icon={<ShieldCheck className="h-5 w-5 text-[hsl(var(--ui-danger))]" />}
            label={
              <span className="text-[hsl(var(--ui-danger))]">Rotate Internal Tokens</span>
            }
            value={<span className="text-[hsl(var(--ui-text-muted))] italic">Coming soon...</span>}
          />

          <SettingsRow
            icon={<Webhook className="h-5 w-5 text-[hsl(var(--ui-danger))]" />}
            label={
              <span className="text-[hsl(var(--ui-danger))]">Diagnostics</span>
            }
            description={<span className="font-mono text-xs">/api/internal/diag</span>}
            value={
              <a href="/api/internal/diag" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-[hsl(var(--ui-danger))] hover:underline">
                Check Diag
              </a>
            }
          />
        </SettingsSection>
      )}
    </SettingsPage>
  );
}
