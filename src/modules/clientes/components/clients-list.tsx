import { EmptyState, FilterBar, SearchInput, SectionHeader, SurfacePanel, StatusChip } from '@/ui/foundation';
import { ClientItem } from './client-item';
import type { ClientActivityBucket, ClientRecord, ClientStatus } from '../types';

type StatusFilter = ClientStatus | 'todos';
type ActivityFilter = ClientActivityBucket | 'todas';

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

export function ClientsList({
    clients,
    totalCount,
    selectedClientId,
    searchValue,
    statusFilter,
    activityFilter,
    onSearchChange,
    onStatusFilterChange,
    onActivityFilterChange,
    onSelectClient,
    rowSelection,
    onRowSelectionChange,
}: {
    clients: ClientRecord[];
    totalCount: number;
    selectedClientId: string;
    searchValue: string;
    statusFilter: StatusFilter;
    activityFilter: ActivityFilter;
    onSearchChange: (value: string) => void;
    onStatusFilterChange: (value: StatusFilter) => void;
    onActivityFilterChange: (value: ActivityFilter) => void;
    onSelectClient: (clientId: string) => void;
    rowSelection?: Record<string, boolean>;
    onRowSelectionChange?: (rowSelection: Record<string, boolean>) => void;
}) {
    return (
        <SurfacePanel className="flex h-full min-h-[42rem] flex-col">
            <SectionHeader
                title="Lista de clientes"
                description="Base operacional para localizar, priorizar e abrir contexto unificado."
                actions={<StatusChip label={`${clients.length}/${totalCount} visiveis`} tone="info" />}
            />

            <div className="mt-4">
                <FilterBar className="gap-3 bg-[hsl(var(--ui-page))]">
                    <SearchInput
                        placeholder="Buscar empresa, contato, cidade ou tag..."
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
                            { label: 'Ativo', value: 'ativo' },
                            { label: 'Monitorado', value: 'monitorado' },
                            { label: 'Em risco', value: 'em-risco' },
                            { label: 'VIP', value: 'vip' },
                        ]}
                    />
                    <FilterSelect
                        label="Atividade"
                        value={activityFilter}
                        onChange={(value) => onActivityFilterChange(value as ActivityFilter)}
                        options={[
                            { label: 'Todas', value: 'todas' },
                            { label: 'Agora', value: 'agora' },
                            { label: 'Hoje', value: 'hoje' },
                            { label: 'Recente', value: 'recente' },
                        ]}
                    />
                </FilterBar>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto pr-1">
                {clients.length === 0 ? (
                    <EmptyState
                        title="Nenhum cliente encontrado"
                        description="Ajuste busca ou filtros para recuperar uma visao operacional relevante."
                    />
                ) : (
                    <div className="space-y-3">
                        {clients.map((client) => (
                            <ClientItem
                                key={client.id}
                                client={client}
                                selected={client.id === selectedClientId}
                                onSelect={() => onSelectClient(client.id)}
                                isSelected={!!rowSelection?.[client.id]}
                                onSelectChange={(checked) => {
                                    if (onRowSelectionChange) {
                                        onRowSelectionChange({ ...rowSelection, [client.id]: checked });
                                    }
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </SurfacePanel>
    );
}
