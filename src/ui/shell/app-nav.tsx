import { SettingsSection, SettingsRow } from '@/ui/settings';
import { Badge } from '@/ui/components';
import { Home, Settings, ShieldAlert } from 'lucide-react';
import { type Role, isSuperAdmin } from '@/ui/auth/entitlements-logic';

interface AppNavProps {
    role: Role | string;
    tenantId: string | null;
}

export function AppNav({ role, tenantId }: AppNavProps) {
    const isSuper = isSuperAdmin(role);
    const cockpitHref = isSuper && tenantId ? { pathname: '/cockpit', query: { tenantId } } : "/cockpit";

    return (
        <div className="space-y-6">
            <SettingsSection title="Workspace">
                <SettingsRow
                    icon={<Home className="h-5 w-5" />}
                    label="Cockpit"
                    href={cockpitHref}
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
