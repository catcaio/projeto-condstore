import { EmptyState, FilterBar, SearchInput, SectionHeader, SurfacePanel, StatusChip } from '@/ui/foundation';
import { ConversationItem } from './conversation-item';
import type { ConversationPriority, ConversationRecord, ConversationStatus } from '../types';

type StatusFilter = ConversationStatus | 'todas';
type PriorityFilter = ConversationPriority | 'todas';

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

export function ConversationList({
    conversations,
    totalCount,
    selectedConversationId,
    searchValue,
    statusFilter,
    priorityFilter,
    ownerFilter,
    owners,
    onSearchChange,
    onStatusFilterChange,
    onPriorityFilterChange,
    onOwnerFilterChange,
    onSelectConversation,
    onAssignConversation,
    onEscalateConversation,
    rowSelection,
    onRowSelectionChange,
}: {
    conversations: ConversationRecord[];
    totalCount: number;
    selectedConversationId: string;
    searchValue: string;
    statusFilter: StatusFilter;
    priorityFilter: PriorityFilter;
    ownerFilter: string;
    owners: string[];
    onSearchChange: (value: string) => void;
    onStatusFilterChange: (value: StatusFilter) => void;
    onPriorityFilterChange: (value: PriorityFilter) => void;
    onOwnerFilterChange: (value: string) => void;
    onSelectConversation: (conversationId: string) => void;
    onAssignConversation?: (conversationId: string) => void;
    onEscalateConversation?: (conversationId: string) => void;
    rowSelection?: Record<string, boolean>;
    onRowSelectionChange?: (rowSelection: Record<string, boolean>) => void;
}) {
    return (
        <SurfacePanel className="flex h-full min-h-[42rem] flex-col">
            <SectionHeader
                title="Lista de conversas"
                description="Fila operacional densa com busca, ownership e leitura imediata do estado."
                actions={<StatusChip label={`${conversations.length}/${totalCount} visiveis`} tone="info" />}
            />

            <div className="mt-4">
                <FilterBar className="gap-3 bg-[hsl(var(--ui-page))]">
                    <SearchInput
                        placeholder="Buscar cliente, pedido, intencao ou owner..."
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
                            { label: 'Todos', value: 'todas' },
                            { label: 'Nova', value: 'nova' },
                            { label: 'Em atendimento', value: 'em-atendimento' },
                            { label: 'Aguardando cliente', value: 'aguardando-cliente' },
                            { label: 'Escalada', value: 'escalada' },
                            { label: 'Resolvida', value: 'resolvida' },
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
                        label="Responsavel"
                        value={ownerFilter}
                        onChange={onOwnerFilterChange}
                        options={[
                            { label: 'Todos', value: 'todos' },
                            ...owners.map((owner) => ({ label: owner, value: owner })),
                        ]}
                    />
                </FilterBar>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto pr-1">
                {conversations.length === 0 ? (
                    <EmptyState
                        title="Nenhuma conversa encontrada"
                        description="Ajuste busca ou filtros para recuperar uma fila operacional relevante."
                    />
                ) : (
                    <div className="space-y-3">
                        {conversations.map((conversation) => (
                            <ConversationItem
                                key={conversation.id}
                                conversation={conversation}
                                selected={conversation.id === selectedConversationId}
                                onSelect={() => onSelectConversation(conversation.id)}
                                isSelected={!!rowSelection?.[conversation.id]}
                                onSelectChange={(checked) => {
                                    if (onRowSelectionChange) {
                                        onRowSelectionChange({ ...rowSelection, [conversation.id]: checked });
                                    }
                                }}
                                onAssign={() => onAssignConversation?.(conversation.id)}
                                onEscalate={() => onEscalateConversation?.(conversation.id)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </SurfacePanel>
    );
}
