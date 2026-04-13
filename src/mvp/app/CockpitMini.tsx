import type { MvpSession } from '../lib/auth';

interface CockpitMiniProps {
  session: MvpSession;
}

/**
 * Minimal cockpit view for authenticated MVP users.
 * Shows the tenant context and quick-links to the full operational surfaces.
 */
export function CockpitMini({ session }: CockpitMiniProps) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Cockpit</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Tenant: <span className="font-mono">{session.tenantId}</span>
          {' · '}
          Perfil: <span className="font-mono">{session.role}</span>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <a
          href="/cockpit"
          className="block rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"
        >
          <span className="font-medium text-sm text-foreground">
            Cockpit completo
          </span>
          <p className="text-xs text-muted-foreground mt-1">
            Acesse o painel operacional
          </p>
        </a>

        <a
          href="/pedidos"
          className="block rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"
        >
          <span className="font-medium text-sm text-foreground">Pedidos</span>
          <p className="text-xs text-muted-foreground mt-1">
            Gerenciar pedidos ativos
          </p>
        </a>

        <a
          href="/conversas"
          className="block rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"
        >
          <span className="font-medium text-sm text-foreground">Conversas</span>
          <p className="text-xs text-muted-foreground mt-1">
            Atendimento via WhatsApp
          </p>
        </a>

        <a
          href="/logistica"
          className="block rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"
        >
          <span className="font-medium text-sm text-foreground">Logística</span>
          <p className="text-xs text-muted-foreground mt-1">
            Rastreio e expedição
          </p>
        </a>
      </div>
    </div>
  );
}
