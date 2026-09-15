import { FilterBar, SearchInput } from '@/ui/foundation';
import type { LogisticsPeriodBucket, LogisticsPriority, LogisticsStatus } from '../mock-data';

type StatusFilter = LogisticsStatus | 'todos';
type PriorityFilter = LogisticsPriority | 'todas';
type PeriodFilter = LogisticsPeriodBucket | 'todos';

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

export function LogisticsFilters({
    searchValue,
    statusFilter,
    exceptionFilter,
    carrierFilter,
    regionFilter,
    deadlineFilter,
    priorityFilter,
    periodFilter,
    carriers,
    onSearchChange,
    onStatusFilterChange,
    onExceptionFilterChange,
    onCarrierFilterChange,
    onRegionFilterChange,
    onDeadlineFilterChange,
    onPriorityFilterChange,
    onPeriodFilterChange,
}: {
    searchValue: string;
    statusFilter: StatusFilter;
    exceptionFilter: string;
    carrierFilter: string;
    regionFilter: string;
    deadlineFilter: string;
    priorityFilter: PriorityFilter;
    periodFilter: PeriodFilter;
    carriers: string[];
    onSearchChange: (value: string) => void;
    onStatusFilterChange: (value: StatusFilter) => void;
    onExceptionFilterChange: (value: string) => void;
    onCarrierFilterChange: (value: string) => void;
    onRegionFilterChange: (value: string) => void;
    onDeadlineFilterChange: (value: string) => void;
    onPriorityFilterChange: (value: PriorityFilter) => void;
    onPeriodFilterChange: (value: PeriodFilter) => void;
}) {
    return (
        <FilterBar className="gap-3 bg-[hsl(var(--ui-page))]">
            <SearchInput
                placeholder="Buscar referencia, pedido, cliente ou transportadora..."
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
                    { label: 'Simulado', value: 'simulado' },
                    { label: 'Aguardando aprovacao', value: 'aguardando-aprovacao' },
                    { label: 'Coletado', value: 'coletado' },
                    { label: 'Em transito', value: 'em-transito' },
                    { label: 'Entregue', value: 'entregue' },
                    { label: 'Atrasado', value: 'atrasado' },
                    { label: 'Excecao', value: 'excecao' },
                ]}
            />
            <FilterSelect
                label="Excecao"
                value={exceptionFilter}
                onChange={onExceptionFilterChange}
                options={[
                    { label: 'Todas', value: 'todas' },
                    { label: 'Com excecao', value: 'com-excecao' },
                    { label: 'Sem excecao', value: 'sem-excecao' },
                ]}
            />
            <FilterSelect
                label="Transportadora"
                value={carrierFilter}
                onChange={onCarrierFilterChange}
                options={[
                    { label: 'Todas', value: 'todas' },
                    ...carriers.map((carrier) => ({ label: carrier, value: carrier })),
                ]}
            />
            <FilterSelect
                label="Regiao"
                value={regionFilter}
                onChange={onRegionFilterChange}
                options={[
                    { label: 'Todas', value: 'todas' },
                    { label: 'Sudeste', value: 'sudeste' },
                    { label: 'Sul', value: 'sul' },
                    { label: 'Nordeste', value: 'nordeste' },
                    { label: 'Centro-Oeste', value: 'centro-oeste' },
                    { label: 'Norte', value: 'norte' },
                ]}
            />
            <FilterSelect
                label="Prazo"
                value={deadlineFilter}
                onChange={onDeadlineFilterChange}
                options={[
                    { label: 'Todos', value: 'todos' },
                    { label: 'Dentro da janela', value: 'janela' },
                    { label: 'SLA rompido', value: 'rompido' },
                    { label: 'Entregue', value: 'entregue' },
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
        </FilterBar>
    );
}
