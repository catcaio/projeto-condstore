import { SettingsRow } from '@/ui/settings';
import { Badge } from '@/ui/components';
import { Package } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';

export function SimulationRow({ item, inspectTenantId }: { item: any, inspectTenantId?: string }) {
    const timeAgo = formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: ptBR });

    // Simplification for status based on valor
    const isSuccess = Number(item.valor) > 0;

    return (
        <SettingsRow
            icon={<Package className="h-5 w-5 text-[hsl(var(--ui-text-muted))]" />}
            label={
                <span className="flex items-center gap-2">
                    <span className="font-semibold text-[14px] truncate w-24">
                        CEP: {item.uf}
                    </span>
                    <Badge variant={isSuccess ? "success" : "danger"}>
                        {isSuccess ? "SUCCESS" : "FAILED"}
                    </Badge>
                </span>
            }
            description={
                <div className="flex gap-2 text-[11px] text-[hsl(var(--ui-text-muted))] mt-0.5">
                    {item.peso && <span>{Number(item.peso).toFixed(2)}kg</span>}
                    {item.utmSource && (
                        <>
                            <span>•</span>
                            <span>src: {item.utmSource}</span>
                        </>
                    )}
                    {item.utmCampaign && (
                        <>
                            <span>•</span>
                            <span className="truncate w-24">cmp: {item.utmCampaign}</span>
                        </>
                    )}
                </div>
            }
            value={
                <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-[hsl(var(--ui-text-muted))] whitespace-nowrap">{timeAgo}</span>
                    <Link href={{ pathname: `/freight/simulations/${item.id}`, query: inspectTenantId ? { tenantId: inspectTenantId } : {} }}>
                        <span className="text-xs font-semibold text-[hsl(var(--ui-accent-blue))] hover:underline cursor-pointer">
                            Detalhes
                        </span>
                    </Link>
                </div>
            }
        />
    );
}
