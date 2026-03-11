import { EmptyState, SectionHeader, SurfacePanel, StatusChip } from '@/ui/foundation';
import { LogisticsFilters } from './logistics-filters';
import { LogisticsItem } from './logistics-item';
import type { LogisticsPeriodBucket, LogisticsPriority, LogisticsRecord, LogisticsStatus } from '../mock-data';

type StatusFilter = LogisticsStatus | 'todos';
type PriorityFilter = LogisticsPriority | 'todas';
type PeriodFilter = LogisticsPeriodBucket | 'todos';

export function LogisticsList({
    items,
    totalCount,
    selectedId,
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
    onSelect,
}: {
    items: LogisticsRecord[];
    totalCount: number;
    selectedId: string;
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
    onSelect: (id: string) => void;
}) {
    return (
        <SurfacePanel className="flex h-full min-h-[42rem] flex-col">
            <SectionHeader
                title="Fila logistica"
                description="Mesa de acompanhamento real para cotacao, SLA, tracking e excecoes."
                actions={<StatusChip label={`${items.length}/${totalCount} visiveis`} tone="info" />}
            />

            <div className="mt-4">
                <LogisticsFilters
                    searchValue={searchValue}
                    statusFilter={statusFilter}
                    exceptionFilter={exceptionFilter}
                    carrierFilter={carrierFilter}
                    regionFilter={regionFilter}
                    deadlineFilter={deadlineFilter}
                    priorityFilter={priorityFilter}
                    periodFilter={periodFilter}
                    carriers={carriers}
                    onSearchChange={onSearchChange}
                    onStatusFilterChange={onStatusFilterChange}
                    onExceptionFilterChange={onExceptionFilterChange}
                    onCarrierFilterChange={onCarrierFilterChange}
                    onRegionFilterChange={onRegionFilterChange}
                    onDeadlineFilterChange={onDeadlineFilterChange}
                    onPriorityFilterChange={onPriorityFilterChange}
                    onPeriodFilterChange={onPeriodFilterChange}
                />
            </div>

            <div className="mt-4 flex-1 overflow-y-auto pr-1">
                {items.length === 0 ? (
                    <EmptyState
                        title="Nenhum registro logistico encontrado"
                        description="Ajuste filtros ou busca para recuperar uma fila logistica relevante."
                    />
                ) : (
                    <div className="space-y-3">
                        {items.map((item) => (
                            <LogisticsItem
                                key={item.id}
                                item={item}
                                selected={item.id === selectedId}
                                onSelect={() => onSelect(item.id)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </SurfacePanel>
    );
}
