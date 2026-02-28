'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge, Card, CardContent, CardHeader, ListGroup, ListItem, NavItem, Separator } from '@/ui/components';
import { Activity, BarChart3, Boxes, LayoutDashboard, Package, Settings2, FileText } from 'lucide-react';
import { useSession } from '@/ui/context/SessionContext';
import { canAccess, type Module } from '@/ui/auth/entitlements-logic';

type NavItemDef = { label: string; href: string; icon: any; module: Module; isPlaceholder?: boolean };

const items: NavItemDef[] = [
  { label: 'Dashboard', href: '/cockpit', icon: LayoutDashboard, module: 'cockpit' },
  { label: 'Analytics', href: '/cockpit/analytics', icon: BarChart3, module: 'cockpit' },
  { label: 'Audit Logs', href: '/cockpit/audit', icon: FileText, module: 'audit' },
  { label: 'Rate Limit', href: '/cockpit/rate-limit', icon: Activity, module: 'settings' },
  { label: 'Cotações', href: '#', icon: Package, module: 'frete', isPlaceholder: true },
  { label: 'Pedidos', href: '#', icon: Boxes, module: 'frete', isPlaceholder: true },
  { label: 'Tenants', href: '#', icon: Settings2, module: 'settings', isPlaceholder: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const auth = useSession();

  return (
    <aside className="lg:sticky lg:top-3 lg:h-[calc(100vh-1.5rem)]">
      <div className="flex h-full flex-col gap-4">
        <Card variant="elevated" className="overflow-hidden">
          <CardHeader
            heading={
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-[hsl(var(--cockpit-accent)/0.12)] text-[hsl(var(--cockpit-accent))]">
                  <LayoutDashboard className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Condstore OS</p>
                  <p className="text-xs font-normal text-[var(--fg)]">Cockpit</p>
                </div>
              </div>
            }
            actions={<Badge variant="muted">Preview</Badge>}
          />
          <CardContent className="pt-0">
            <nav aria-label="Navegacao do cockpit" className="space-y-3">
              <ListGroup>
                {items.map((item, index) => {
                  const isSettings = item.module === 'settings';
                  if (isSettings && auth.role !== 'admin') {
                    return null; // hide settings for non-admins completely
                  }

                  const hasAccess = canAccess(item.module, auth);
                  const isActive = !item.isPlaceholder && (pathname === item.href || (item.href !== '/cockpit' && pathname.startsWith(`${item.href}/`)));
                  const isPlaceholder = item.isPlaceholder;

                  let trailingContent = isActive ? <Badge variant="default">Ativo</Badge> : undefined;

                  if (!hasAccess) {
                    trailingContent = (
                      <Badge variant="outline" className="border-red-500 text-red-500 whitespace-nowrap">
                        {auth.role === 'admin' ? 'Sem permissão' : (item.module === 'audit' ? 'Sem permissão' : 'Plano')}
                      </Badge>
                    );
                  } else if (isPlaceholder) {
                    trailingContent = <Badge variant="outline">Soon</Badge>;
                  }

                  return (
                    <div key={item.label}>
                      {isPlaceholder && !hasAccess ? (
                        <ListItem
                          leading={item.icon ? <item.icon className="h-4 w-4 opacity-50" /> : undefined}
                          trailing={trailingContent}
                        >
                          <span className="text-[var(--fg)] opacity-50">{item.label}</span>
                        </ListItem>
                      ) : isPlaceholder && hasAccess ? (
                        <ListItem
                          leading={item.icon ? <item.icon className="h-4 w-4" /> : undefined}
                          trailing={trailingContent}
                        >
                          <span className="text-[var(--fg)]">{item.label}</span>
                        </ListItem>
                      ) : (
                        <NavItem
                          href={item.href}
                          label={item.label}
                          icon={item.icon}
                          active={isActive}
                          disabled={!hasAccess}
                          trailing={trailingContent}
                        />
                      )}
                      {index < items.length - 1 ? <Separator /> : null}
                    </div>
                  );
                })}
              </ListGroup>

              <ListGroup>
                <ListItem as="div" leading={<Activity className="h-4 w-4" />}>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[var(--fg)]">Status do painel</p>
                    <p className="text-xs text-[var(--fg)]">Shell UI FRONT-01 ativo</p>
                  </div>
                </ListItem>
              </ListGroup>
            </nav>
          </CardContent>
        </Card>

        <Card className="hidden lg:block">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-[hsl(var(--cockpit-accent)/0.12)] text-[hsl(var(--cockpit-accent))] uppercase">
                {auth.role[0]}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--fg)] capitalize">{auth.role}</p>
                <p className="truncate text-xs text-[var(--fg)]">
                  {auth.hasActivePlan ? 'Plano Ativo' : 'Sem Plano'}
                </p>
              </div>
            </div>
            <Separator className="my-3" />
            <Link href="/login" className="text-xs text-[hsl(var(--cockpit-accent))] hover:underline">
              Ir para login
            </Link>
          </CardContent>
        </Card>
      </div>
    </aside>
  );
}
