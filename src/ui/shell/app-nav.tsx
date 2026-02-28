import { SettingsSection, SettingsRow } from '@/ui/settings';
import { Badge } from '@/ui/components';
import { Home, Settings, ShieldAlert, Inbox, Target, Activity } from 'lucide-react';
import { type Role, isSuperAdmin } from '@/ui/auth/entitlements-logic';

interface AppNavProps {
    role: Role | string;
    tenantId: string | null;
}

export function AppNav({ role, tenantId }: AppNavProps) {
    const isSuper = isSuperAdmin(role);
    const cockpitHref = isSuper && tenantId ? { pathname: '/cockpit', query: { tenantId } } : "/cockpit";
    const inboxHref = isSuper && tenantId ? { pathname: '/inbox', query: { tenantId } } : "/inbox";
    const attrHref = isSuper && tenantId ? { pathname: '/attribution', query: { tenantId } } : "/attribution";

    const homeHref = isSuper && tenantId ? { pathname: '/home', query: { tenantId } } : "/home";

    return (
        <div className="space-y-6">
            <SettingsSection title="Workspace">
                <SettingsRow
                    icon={<Home className="h-5 w-5 text-[hsl(var(--ui-text))] " />}
                    label="Home"
                    href={homeHref}
                />
                <SettingsRow
                    icon={<Activity className="h-5 w-5 text-[hsl(var(--ui-text-muted))]" />}
                    label="Cockpit"
                    href={cockpitHref}
                />
                <SettingsRow
                    icon={<Inbox className="h-5 w-5 text-[hsl(var(--ui-text-muted))]" />}
                    label="Inbox"
                    href={inboxHref}
                />
                <SettingsRow
                    icon={<Target className="h-5 w-5 text-[hsl(var(--ui-text-muted))]" />}
                    label="Origem & Conversão"
                    href={attrHref}
                />
                <SettingsRow
                    icon={<Settings className="h-5 w-5" />}
                    label="Configurações"
                    href="/settings"
                />
            </SettingsSection>

            {isSuper && (
                <SettingsSection title="System Administration">
                    <SettingsRow
                        icon={<ShieldAlert className="h-5 w-5 text-[hsl(var(--ui-danger))]" />}
                        label={
                            <span className="text-[hsl(var(--ui-danger))]">Supreme Cockpit</span>
                        }
                        href="/supreme"
                        value={<Badge variant="danger">SUPREME</Badge>}
                    />
                </SettingsSection>
            )}
        </div>
    );
}
