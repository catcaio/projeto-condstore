import { SettingsSection, SettingsRow } from '@/ui/settings';
import { Badge, Button } from '@/ui/components';
import { getActivationMilestones } from '../queries';
import { CheckCircle2, Circle, Store, Calculator, MessageSquare, LayoutDashboard, UserPlus } from 'lucide-react';
import Link from 'next/link';

export async function ActivationSection({ tenantId }: { tenantId: string }) {
    const milestones = await getActivationMilestones(tenantId);

    // Auto-record cockpit viewed if not present? Wait, the prompt says "Disparos... cockpit_viewed: primeira visita ao cockpit".
    // Since this is a server component, we could just trigger the tracking on the client via a tiny client component inside ActivationSection, or let's use a Tracker component.

    const count = Object.values(milestones).filter(Boolean).length;

    let cta: React.ReactNode = null;

    // CTA contextual
    if (!milestones.store_connected) {
        cta = (
            <Link href="/settings">
                <Button variant="primary" className="w-full justify-center">
                    Conectar loja
                </Button>
            </Link>
        );
    } else if (!milestones.first_freight_simulation) {
        cta = (
            <Link href="/painel-logistico">
                <Button variant="primary" className="w-full justify-center">
                    Fazer 1ª cotação
                </Button>
            </Link>
        );
    } else if (!milestones.first_whatsapp_message) {
        cta = (
            <Link href="/settings">
                <Button variant="primary" className="w-full justify-center">
                    Enviar 1ª mensagem
                </Button>
            </Link>
        );
    }

    return (
        <SettingsSection title={`Ativação (${count}/5)`}>
            <div className="flex flex-col gap-[1px] bg-[hsl(var(--ui-border))] rounded-lg overflow-hidden border border-[hsl(var(--ui-border))] mb-4">
                <MilestoneRow
                    isDone={milestones.signup_created}
                    label="Conta Criada"
                    icon={<UserPlus className="h-4 w-4" />}
                />
                <MilestoneRow
                    isDone={milestones.store_connected}
                    label="Conectar loja (e-commerce ou ERP)"
                    icon={<Store className="h-4 w-4" />}
                />
                <MilestoneRow
                    isDone={milestones.first_freight_simulation}
                    label="Fazer a 1ª cotação de frete livre"
                    icon={<Calculator className="h-4 w-4" />}
                />
                <MilestoneRow
                    isDone={milestones.first_whatsapp_message}
                    label="Enviar a primeira mensagem pelo Bot"
                    icon={<MessageSquare className="h-4 w-4" />}
                />
                <MilestoneRow
                    isDone={milestones.cockpit_viewed}
                    label="Visualizar a fila e dashboards no Cockpit"
                    icon={<LayoutDashboard className="h-4 w-4" />}
                />
            </div>
            {cta && (
                <div className="px-4 py-2 border-t border-[hsl(var(--ui-border))] flex items-center justify-end">
                    {cta}
                </div>
            )}
        </SettingsSection>
    );
}

function MilestoneRow({ isDone, label, icon }: { isDone: boolean, label: string, icon: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3 px-4 py-3 bg-[hsl(var(--ui-surface))] transition-colors">
            {isDone ? (
                <CheckCircle2 className="h-5 w-5 text-[hsl(var(--ui-success))]" />
            ) : (
                <Circle className="h-5 w-5 text-[hsl(var(--ui-border))]" />
            )}
            <div className="flex items-center gap-2 flex-1">
                <div className={isDone ? 'text-[hsl(var(--ui-text-muted))]' : 'text-[hsl(var(--ui-text-muted))]'}>{icon}</div>
                <span className={`text-sm font-medium ${isDone ? 'text-[hsl(var(--ui-text-muted))] line-through' : 'text-[hsl(var(--ui-text))]'}`}>
                    {label}
                </span>
            </div>
            {isDone && <Badge variant="success">Feito</Badge>}
        </div>
    );
}
