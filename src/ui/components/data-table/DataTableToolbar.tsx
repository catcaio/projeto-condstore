'use client';

import React from 'react';
import { Table as TanstackTable } from '@tanstack/react-table';
import { Search } from 'lucide-react';
import { TextField } from '@/ui/components';

interface DataTableToolbarProps<TData> {
    table: TanstackTable<TData>;
    searchKey?: string;
    searchPlaceholder?: string;
}

export function DataTableToolbar<TData>({
    table,
    searchKey,
    searchPlaceholder = 'Buscar...',
}: DataTableToolbarProps<TData>) {
    return (
        <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--ui-border))]">
            <div className="flex flex-1 items-center space-x-2">
                {searchKey && (
                    <div className="w-full max-w-sm relative">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-[hsl(var(--ui-text-muted))]" />
                        </div>
                        <input
                            type="text"
                            placeholder={searchPlaceholder}
                            value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ''}
                            onChange={(event) =>
                                table.getColumn(searchKey)?.setFilterValue(event.target.value)
                            }
                            className="h-9 w-full rounded-md border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] pl-9 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-[hsl(var(--ui-text-muted))] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--ui-accent-blue))] text-[hsl(var(--ui-text))]"
                        />
                    </div>
                )}
            </div>
            {/* Slot para filtros avançados no futuro */}
        </div>
    );
}
