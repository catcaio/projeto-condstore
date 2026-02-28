'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge, Card, CardContent, CardHeader, ListGroup, ListItem, NavItem, Separator } from '@/ui/components';
import { Activity, BarChart3, Boxes, LayoutDashboard, Package, Settings2, FileText } from 'lucide-react';
import { useSession } from '@/ui/context/SessionContext';
import { canAccess, type Module } from '@/ui/auth/entitlements-logic';

import { MODULES } from '@/config/modules';

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
                  <p className="text-xs font-normal text-[hsl(var(--cockpit-text-muted))]">Cockpit</p>
                </div>
              </div>
            }
            actions={<Badge variant="muted">Preview</Badge>}
          />
          <CardContent className="pt-0">
            <nav aria-label="Navegacao do cockpit" className="space-y-3">
              <div className="space-y-6">
                {Object.entries(
                  MODULES.reduce((acc, current) => {
                    if (!acc[current.group]) acc[current.group] = [];
                    acc[current.group].push(current);
                    return acc;
                  }, {} as Record<string, typeof MODULES>)
                ).map(([groupName, groupModules], groupIdx) => {
                  const visibleModules = groupModules.filter(item => {
                    const isSettingsOrAdmin = item.authModule === 'settings' || item.authModule === 'admin';
                    if (isSettingsOrAdmin && auth.role !== 'admin') return false;
                    return true;
                  });

                  if (visibleModules.length === 0) return null;

                  return (
                    <div key={groupName}>
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--cockpit-text-muted))] mb-2 px-3 opacity-80">
                        {groupName}
                      </h4>
                      <ListGroup>
                        {visibleModules.map((item, index) => {
                          const hasAccess = canAccess(item.authModule, auth);
                          const isActive = !item.isPlaceholder && (pathname === item.route || (item.route !== '/cockpit' && pathname.startsWith(`${item.route}/`)));
                          const isPlaceholder = item.isPlaceholder;

                          let trailingContent = isActive ? <Badge variant="default">Ativo</Badge> : undefined;

                          if (!hasAccess) {
                            trailingContent = (
                              <Badge variant="outline" className="border-red-500 text-red-500 whitespace-nowrap">
                                {auth.role === 'admin' ? 'Sem permissão' : (item.authModule === 'audit' ? 'Sem permissão' : 'Plano')}
                              </Badge>
                            );
                          } else if (isPlaceholder) {
                            trailingContent = <Badge variant="outline">Soon</Badge>;
                          }

                          return (
                            <div key={item.id}>
                              {isPlaceholder && !hasAccess ? (
                                <ListItem
                                  leading={item.icon ? <item.icon className="h-4 w-4 opacity-50" /> : undefined}
                                  trailing={trailingContent}
                                >
                                  <span className="text-[hsl(var(--cockpit-text-muted))] opacity-50">{item.label}</span>
                                </ListItem>
                              ) : isPlaceholder && hasAccess ? (
                                <ListItem
                                  leading={item.icon ? <item.icon className="h-4 w-4" /> : undefined}
                                  trailing={trailingContent}
                                >
                                  <span className="text-[hsl(var(--cockpit-text-muted))]">{item.label}</span>
                                </ListItem>
                              ) : (
                                <NavItem
                                  href={item.route}
                                  label={item.label}
                                  icon={item.icon}
                                  active={isActive}
                                  disabled={!hasAccess}
                                  trailing={trailingContent}
                                />
                              )}
                              {index < visibleModules.length - 1 ? <Separator /> : null}
                            </div>
                          );
                        })}
                      </ListGroup>
                    </div>
                  );
                })}
              </div>

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
              <div className="grid h-10 w-10 place-items-center rounded-full bg-[hsl(var(--cockpit-accent)/0.12)] text-[hsl(var(--cockpit-accent))] uppercase">
                {auth.role[0]}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[hsl(var(--cockpit-text))] capitalize">{auth.role}</p>
                <p className="truncate text-xs text-[hsl(var(--cockpit-text-muted))]">
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
