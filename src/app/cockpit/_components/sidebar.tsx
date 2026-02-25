'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge, Card, CardContent, CardHeader, ListGroup, ListItem, NavItem, Separator } from '@/ui/components';
import { Activity, BarChart3, Boxes, LayoutDashboard, Package, Settings2 } from 'lucide-react';

const items = [
  { label: 'Dashboard', href: '/cockpit', icon: LayoutDashboard },
  { label: 'Analytics', href: '/cockpit/analytics', icon: BarChart3 },
  { label: 'Rate Limit', href: '/cockpit/rate-limit', icon: Activity },
  { label: 'Cotações', href: '#', icon: Package },
  { label: 'Pedidos', href: '#', icon: Boxes },
  { label: 'Tenants', href: '#', icon: Settings2 },
];

export default function Sidebar() {
  const pathname = usePathname();

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
                  <p className="text-xs font-normal text-[hsl(var(--cockpit-text-muted))]">Cockpit</p>
                </div>
              </div>
            }
            actions={<Badge variant="muted">Preview</Badge>}
          />
          <CardContent className="pt-0">
            <nav aria-label="Navegacao do cockpit" className="space-y-3">
              <ListGroup>
                {items.map((item, index) => {
                  const isActive = item.href !== '#' && (pathname === item.href || pathname.startsWith(`${item.href}/`));
                  const isPlaceholder = item.href === '#';

                  return (
                    <div key={item.label}>
                      {isPlaceholder ? (
                        <ListItem
                          leading={item.icon ? <item.icon className="h-4 w-4" /> : undefined}
                          trailing={<Badge variant="outline">Soon</Badge>}
                        >
                          <span className="text-[hsl(var(--cockpit-text-muted))]">{item.label}</span>
                        </ListItem>
                      ) : (
                        <NavItem
                          href={item.href}
                          label={item.label}
                          icon={item.icon}
                          active={isActive}
                          trailing={isActive ? <Badge variant="default">Ativo</Badge> : undefined}
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
                    <p className="text-xs font-medium text-[hsl(var(--cockpit-text))]">Status do painel</p>
                    <p className="text-xs text-[hsl(var(--cockpit-text-muted))]">Shell UI FRONT-01 ativo</p>
                  </div>
                </ListItem>
              </ListGroup>
            </nav>
          </CardContent>
        </Card>

        <Card className="hidden lg:block">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-[hsl(var(--cockpit-accent)/0.12)] text-[hsl(var(--cockpit-accent))]">
                A
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[hsl(var(--cockpit-text))]">Admin</p>
                <p className="truncate text-xs text-[hsl(var(--cockpit-text-muted))]">Sessao autenticada</p>
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
