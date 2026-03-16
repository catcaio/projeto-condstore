'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { DataTable, type DataTableProps } from '@/ui/components/data-table/DataTable';
import { SearchInput, SavedViewsTabs } from './index';

export function UniversalListView<TData, TValue>({
    title,
    description,
    data,
    columns,
    searchPlaceholder = "Buscar...",
    searchValue,
    onSearchChange,
    actions,
    filters,
    views,
    activeView,
    onViewChange,
    className,
    ...dataTableProps
}: {
    title?: string;
    description?: string;
    data: TData[];
    columns: any; // Using any here to bypass complex generic inference from upstream, typed at usage level
    searchPlaceholder?: string;
    searchValue?: string;
    onSearchChange?: (val: string) => void;
    actions?: React.ReactNode;
    filters?: React.ReactNode;
    views?: { id: string; label: string; icon?: React.ReactNode }[];
    activeView?: string;
    onViewChange?: (id: string) => void;
    className?: string;
} & Omit<DataTableProps<TData, TValue>, 'data' | 'columns' | 'searchKey' | 'searchPlaceholder'>) {

    const finalColumns = React.useMemo(() => {
        if (!dataTableProps.enableRowSelection && !dataTableProps.onRowSelectionChange) {
            return columns;
        }

        const selectionColumn = {
            id: 'select',
            header: ({ table }: any) => (
                <div className="px-1 flex items-center justify-center">
                    <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-[hsl(var(--ui-border))] bg-transparent accent-[hsl(var(--ui-primary))] focus:ring-2 focus:ring-[hsl(var(--ui-primary))/50] focus:ring-offset-0 cursor-pointer"
                        checked={table.getIsAllPageRowsSelected()}
                        onChange={(e) => table.toggleAllPageRowsSelected(!!e.target.checked)}
                        aria-label="Selecionar todos"
                    />
                </div>
            ),
            cell: ({ row }: any) => (
                <div className="px-1 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                    <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-[hsl(var(--ui-border))] bg-transparent accent-[hsl(var(--ui-primary))] focus:ring-2 focus:ring-[hsl(var(--ui-primary))/50] focus:ring-offset-0 cursor-pointer"
                        checked={row.getIsSelected()}
                        onChange={(e) => row.toggleSelected(!!e.target.checked)}
                        aria-label="Selecionar linha"
                    />
                </div>
            ),
            enableSorting: false,
            enableHiding: false,
        };

        return [selectionColumn, ...columns];
    }, [columns, dataTableProps.enableRowSelection, dataTableProps.onRowSelectionChange]);

    return (
        <div className={cn("flex flex-col h-full space-y-4", className)}>
            {(views || filters || onSearchChange || actions) && (
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-[1.25rem] border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-3 shadow-sm">
                    <div className="flex items-center gap-4 flex-wrap flex-1">
                        {views && activeView && onViewChange && (
                            <SavedViewsTabs 
                                views={views}
                                activeView={activeView}
                                onChange={onViewChange}
                            />
                        )}
                        
                        {views && (onSearchChange || filters) && (
                            <div className="h-6 w-px bg-[hsl(var(--ui-border))]" />
                        )}
                        
                        {onSearchChange && (
                            <SearchInput 
                                placeholder={searchPlaceholder}
                                value={searchValue}
                                onChange={(e) => onSearchChange(e.target.value)}
                                className="w-full max-w-xs"
                            />
                        )}
                        
                        {filters}
                    </div>
                    
                    {actions && (
                        <div className="flex items-center gap-3 shrink-0">
                            {actions}
                        </div>
                    )}
                </div>
            )}
            
            <div className="flex-1 bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border))] rounded-[1.5rem] overflow-hidden flex flex-col min-h-[400px] shadow-sm">
                <DataTable 
                    data={data}
                    columns={finalColumns}
                    className="border-0 rounded-none w-full h-full flex-1 [&_th]:bg-[hsl(var(--ui-page))] [&_th]:text-[hsl(var(--ui-text-subtle))] [&_th]:font-bold [&_th]:tracking-wider [&_th]:uppercase [&_th]:text-xs [&_td]:py-4"
                    {...dataTableProps}
                />
            </div>
        </div>
    );
}
