import { FilterBar, SearchInput } from '@/ui/foundation';
import type { OrderChannel, OrderPeriodBucket, OrderPriority, OrderStatus } from '../mock-data';

type StatusFilter = OrderStatus | 'todos';
type PriorityFilter = OrderPriority | 'todas';
type ChannelFilter = OrderChannel | 'todos';
type PeriodFilter = OrderPeriodBucket | 'todos';

function FilterSelect({
    label,
    value,
    onChange,
    options,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: Array<{ label: string; value: string }>;
}) {
    return (
        <label className="flex min-w-[10rem] flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[hsl(var(--ui-text-subtle))]">{label}</span>
            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="h-11 rounded-2xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] px-3 text-sm text-[hsl(var(--ui-text))] outline-none"
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </label>
    );
}

export function OrderFilters({
    searchValue,
    statusFilter,
    priorityFilter,
    channelFilter,
    periodFilter,
    ownerFilter,
    owners,
    onSearchChange,
    onStatusFilterChange,
    onPriorityFilterChange,
    onChannelFilterChange,
    onPeriodFilterChange,
    onOwnerFilterChange,
}: {
    searchValue: string;
    statusFilter: StatusFilter;
    priorityFilter: PriorityFilter;
    channelFilter: ChannelFilter;
    periodFilter: PeriodFilter;
    ownerFilter: string;
    owners: string[];
    onSearchChange: (value: string) => void;
    onStatusFilterChange: (value: StatusFilter) => void;
    onPriorityFilterChange: (value: PriorityFilter) => void;
    onChannelFilterChange: (value: ChannelFilter) => void;
    onPeriodFilterChange: (value: PeriodFilter) => void;
    onOwnerFilterChange: (value: string) => void;
}) {
    return (
        <FilterBar className="gap-3 bg-[hsl(var(--ui-page))]">
            <SearchInput
                placeholder="Buscar pedido, cliente, owner ou origem..."
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                readOnly={false}
                className="md:min-w-[100%]"
            />
            <FilterSelect
                label="Status"
                value={statusFilter}
                onChange={(value) => onStatusFilterChange(value as StatusFilter)}
                options={[
                    { label: 'Todos', value: 'todos' },
                    { label: 'Recebido', value: 'recebido' },
                    { label: 'Em analise', value: 'em-analise' },
                    { label: 'Aprovado', value: 'aprovado' },
                    { label: 'Faturado', value: 'faturado' },
                    { label: 'Expedido', value: 'expedido' },
                    { label: 'Concluido', value: 'concluido' },
                    { label: 'Excecao', value: 'excecao' },
                ]}
            />
            <FilterSelect
                label="Prioridade"
                value={priorityFilter}
                onChange={(value) => onPriorityFilterChange(value as PriorityFilter)}
                options={[
                    { label: 'Todas', value: 'todas' },
                    { label: 'Critica', value: 'critica' },
                    { label: 'Alta', value: 'alta' },
                    { label: 'Media', value: 'media' },
                    { label: 'Baixa', value: 'baixa' },
                ]}
            />
            <FilterSelect
                label="Canal"
                value={channelFilter}
                onChange={(value) => onChannelFilterChange(value as ChannelFilter)}
                options={[
                    { label: 'Todos', value: 'todos' },
                    { label: 'WhatsApp', value: 'WhatsApp' },
                    { label: 'Portal', value: 'Portal' },
                    { label: 'Inside Sales', value: 'Inside Sales' },
                    { label: 'B2B API', value: 'B2B API' },
                ]}
            />
            <FilterSelect
                label="Periodo"
                value={periodFilter}
                onChange={(value) => onPeriodFilterChange(value as PeriodFilter)}
                options={[
                    { label: 'Todos', value: 'todos' },
                    { label: 'Hoje', value: 'hoje' },
                    { label: '24h', value: '24h' },
                    { label: '7d', value: '7d' },
                    { label: '30d', value: '30d' },
                ]}
            />
            <FilterSelect
                label="Responsavel"
                value={ownerFilter}
                onChange={onOwnerFilterChange}
                options={[
                    { label: 'Todos', value: 'todos' },
                    ...owners.map((owner) => ({ label: owner, value: owner })),
                ]}
            />
        </FilterBar>
    );
}
