import { SettingsSection, SettingsRow } from '@/ui/settings';
import { Badge } from '@/ui/components';
import { Home, Settings, ShieldAlert, Inbox, Target, Activity, Package } from 'lucide-react';
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
            <SettingsSection title="OPERATIONS">
                <SettingsRow
                    icon={<Activity className="h-5 w-5 text-[hsl(var(--ui-text-muted))]" />}
                    label="Status"
                    href={isSuper && tenantId ? { pathname: '/cockpit/status', query: { tenantId } } : "/cockpit/status"}
                />
                <SettingsRow
                    icon={<Target className="h-5 w-5 text-[hsl(var(--ui-text-muted))]" />}
                    label="Audit Logs"
                    href={isSuper && tenantId ? { pathname: '/cockpit/status/audit', query: { tenantId } } : "/cockpit/status/audit"}
                />
                <SettingsRow
                    icon={<Inbox className="h-5 w-5 text-[hsl(var(--ui-text-muted))]" />}
                    label="Strategic Facts"
                    href={isSuper && tenantId ? { pathname: '/cockpit/strategic-facts', query: { tenantId } } : "/cockpit/strategic-facts"}
                />
            </SettingsSection>

            <SettingsSection title="DOMINE">
                <SettingsRow
                    icon={<Package className="h-5 w-5 text-[hsl(var(--ui-text-muted))]" />}
                    label="Overview"
                    href={isSuper && tenantId ? { pathname: '/cockpit/domine', query: { tenantId } } : "/cockpit/domine"}
                />
                <SettingsRow
                    icon={<ShieldAlert className="h-5 w-5 text-[hsl(var(--ui-text-muted))]" />}
                    label="DLQ (Dead Letter Queue)"
                    href={isSuper && tenantId ? { pathname: '/cockpit/domine/dlq', query: { tenantId } } : "/cockpit/domine/dlq"}
                />
                <SettingsRow
                    icon={<Activity className="h-5 w-5 text-[hsl(var(--ui-text-muted))]" />}
                    label="Health"
                    href={isSuper && tenantId ? { pathname: '/cockpit/domine/health', query: { tenantId } } : "/cockpit/domine/health"}
                />
            </SettingsSection>

            <SettingsSection title="SETTINGS">
                <SettingsRow
                    icon={<ShieldAlert className="h-5 w-5 text-[hsl(var(--ui-text-muted))]" />}
                    label="Security"
                    href={isSuper && tenantId ? { pathname: '/cockpit/settings/security', query: { tenantId } } : "/cockpit/settings/security"}
                />
                <SettingsRow
                    icon={<Settings className="h-5 w-5 text-[hsl(var(--ui-text-muted))]" />}
                    label="Knowledge Base"
                    href={isSuper && tenantId ? { pathname: '/cockpit/settings/knowledge', query: { tenantId } } : "/cockpit/settings/knowledge"}
                />
            </SettingsSection>

            {isSuper && (
                <SettingsSection title="GLOBAL ADMIN">
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
