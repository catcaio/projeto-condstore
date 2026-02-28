import { SettingsSection, SettingsRow } from '@/ui/settings';
import { CreditCard, Activity, BarChart, History } from 'lucide-react';

export function EmptyBilling() {
    return (
        <SettingsSection title="Billing & Plan">
            <div className="p-6 flex flex-col items-center justify-center text-center gap-2">
                <CreditCard className="h-8 w-8 text-[hsl(var(--ui-text-muted))]" />
                <div className="text-sm font-medium text-[hsl(var(--ui-text))]">Nenhum plano ativo</div>
                <div className="text-[13px] text-[hsl(var(--ui-text-muted))]">
                    Você ainda não configurou um plano de assinatura para este workspace.
                </div>
            </div>
        </SettingsSection>
    );
}

export function EmptyUsage() {
    return (
        <SettingsSection title="Usage & FinOps">
            <div className="p-6 flex flex-col items-center justify-center text-center gap-2">
                <Activity className="h-8 w-8 text-[hsl(var(--ui-text-muted))]" />
                <div className="text-sm font-medium text-[hsl(var(--ui-text))]">Sem dados de uso</div>
                <div className="text-[13px] text-[hsl(var(--ui-text-muted))]">
                    Nenhum token ou uso registrado neste mês.
                </div>
            </div>
        </SettingsSection>
    );
}

export function EmptyFunnel() {
    return (
        <SettingsSection title="Performance do Funil (Últimos 7 dias)">
            <div className="p-6 flex flex-col items-center justify-center text-center gap-2">
                <BarChart className="h-8 w-8 text-[hsl(var(--ui-text-muted))]" />
                <div className="text-sm font-medium text-[hsl(var(--ui-text))]">Funil vazio</div>
                <div className="text-[13px] text-[hsl(var(--ui-text-muted))]">
                    Nenhuma interação realizada nos últimos 7 dias. Divulgue seu link para começar a ver conversões.
                </div>
            </div>
        </SettingsSection>
    );
}

export function EmptyActivity() {
    return (
        <SettingsSection title="Atividade Recente">
            <div className="p-4 text-[13px] text-[hsl(var(--ui-text-muted))] text-center">
                <History className="h-8 w-8 text-[hsl(var(--ui-text-muted))] mx-auto mb-2" />
                Sem eventos registrados recentemente.
            </div>
        </SettingsSection>
    );
}
