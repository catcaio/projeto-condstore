import type { Metadata } from 'next';
import { SettingsPage, SettingsSection, SettingsRow } from '@/ui/settings';
import { ShieldCheck, Server, Globe, User, LogOut } from 'lucide-react';
import { Badge } from '@/ui/components/badge';

export const metadata: Metadata = {
  title: 'Configurações — Condstore OS',
};

function detectEnvironment(): string {
  if (process.env.VERCEL_ENV === 'production') return 'Produção';
  if (process.env.VERCEL_ENV === 'preview') return 'Preview';
  return 'Local';
}

function detectDomain(): string {
  if (process.env.VERCEL_ENV === 'production') return 'app.condstoreos.com';
  if (process.env.VERCEL_URL) return process.env.VERCEL_URL;
  return 'localhost';
}

export default function Settings() {
  const envLabel = detectEnvironment();
  const domainLabel = detectDomain();

  return (
    <SettingsPage
      title="Configurações"
      description="Gerencie preferências, ambiente e sua conta"
    >
      <SettingsSection title="Sistema & Plataforma">
        <SettingsRow
          icon={<Server className="h-5 w-5" />}
          label="Ambiente"
          value={<Badge variant={envLabel === 'Produção' ? 'success' : 'muted'}>{envLabel}</Badge>}
        />
        <SettingsRow
          icon={<Globe className="h-5 w-5" />}
          label="Domínio ativo"
          value={<span className="font-mono text-xs">{domainLabel}</span>}
        />
      </SettingsSection>

      <SettingsSection title="Perfil Administrativo">
        <SettingsRow
          icon={<User className="h-5 w-5" />}
          label="Minha conta"
          description="Acesso restrito para administração do módulo"
          value="Admin"
        />
        <SettingsRow
          icon={<ShieldCheck className="h-5 w-5" />}
          label="Permissão"
          value={<Badge variant="default">Root</Badge>}
        />
      </SettingsSection>

      <SettingsSection title="Sessão">
        <SettingsRow
          icon={<LogOut className="h-5 w-5 text-[hsl(var(--ui-danger-ink))]" />}
          label={<span className="text-[hsl(var(--ui-danger-ink))]">Encerrar sessão</span>}
          href="/api/auth/logout"
          showChevron
        />
      </SettingsSection>
    </SettingsPage>
  );
}
