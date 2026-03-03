import { SettingsRow } from '@/ui/settings';
import { Badge, Progress } from '@/ui/components';
import { Target } from 'lucide-react';
import { type AttributionSummaryRow } from '../queries';

export function AttributionRow({ item, index }: { item: AttributionSummaryRow; index: number }) {
    const { key, clicks, sessions, simulations, started, completed, convRate } = item;

    // A color purely for the bar based on convRate
    const getIndicatorColor = () => {
        if (convRate >= 50) return 'bg-[hsl(var(--ui-success))]';
        if (convRate >= 20) return 'bg-[hsl(var(--ui-accent-blue))]';
        if (convRate > 0) return 'bg-[hsl(var(--ui-warning))]';
        return 'bg-[hsl(var(--ui-muted))]';
    };

    return (
        <SettingsRow
            icon={
                <div className="flex bg-[hsl(var(--ui-muted))] rounded-full h-8 w-8 items-center justify-center font-bold text-xs text-[hsl(var(--ui-text))]">
                    #{index + 1}
                </div>
            }
            label={
                <span className="flex items-center gap-2">
                    <span className="font-semibold text-[14px] truncate max-w-[200px]" title={key}>{key}</span>
                </span>
            }
            description={
                <div className="flex gap-3 text-[11px] text-[hsl(var(--ui-text-muted))] mt-1">
                    <span><strong className="text-[hsl(var(--ui-text))]">{sessions}</strong> sessões</span>
                    <span>•</span>
                    <span><strong className="text-[hsl(var(--ui-text))]">{clicks}</strong> cliques</span>
                    <span>•</span>
                    <span><strong className="text-[hsl(var(--ui-text))]">{simulations}</strong> simulações</span>
                </div>
            }
            value={
                <div className="flex flex-col items-end gap-1.5 w-32">
                    <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-[hsl(var(--ui-text-muted))]">{completed}/{started}</span>
                        <strong className="text-[hsl(var(--ui-text))]">{convRate}%</strong>
                    </div>
                    <Progress value={convRate} max={100} indicatorClassName={getIndicatorColor()} className="h-1.5" />
                </div>
            }
        />
    );
}
