'use client';

import React, { useState } from 'react';
import {
    ColumnDef,
    SortingState,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    flexRender,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

import { DataTableToolbar } from './DataTableToolbar';
import { DataTablePagination } from './DataTablePagination';
import { DataTableSkeleton } from './DataTableSkeleton';
import { DataTableEmpty } from './DataTableEmpty';
import { DataTableError } from './DataTableError';

export interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    initialSorting?: SortingState;
    rowActions?: React.ReactNode;
    onRowClick?: (row: TData) => void;
    isLoading?: boolean;
    isError?: boolean;
    errorRequestId?: string;
    onRetry?: () => void;
    searchKey?: string;
    searchPlaceholder?: string;
    className?: string;
    virtualizeThreshold?: number;
}

export function DataTable<TData, TValue>({
    columns,
    data,
    initialSorting = [],
    onRowClick,
    isLoading,
    isError,
    errorRequestId,
    onRetry,
    searchKey,
    searchPlaceholder,
    className,
    virtualizeThreshold = 50,
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = useState<SortingState>(initialSorting);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onSortingChange: setSorting,
        state: {
            sorting,
        },
    });

    const parentRef = React.useRef<HTMLDivElement>(null);
    const isVirtual = data.length > virtualizeThreshold;

    const rowVirtualizer = useVirtualizer({
        count: table.getRowModel().rows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 48,
        overscan: 10,
    });

    if (isLoading) {
        return <DataTableSkeleton columnCount={columns.length} />;
    }

    if (isError) {
        return <DataTableError requestId={errorRequestId} onRetry={onRetry} />;
    }

    if (!data || data.length === 0) {
        return <DataTableEmpty />;
    }

    const { rows } = table.getRowModel();

    return (
        <div className={cn('flex flex-col rounded-md border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))]', className)}>
            {searchKey && (
                <DataTableToolbar table={table} searchKey={searchKey} searchPlaceholder={searchPlaceholder} />
            )}
            <div
                ref={parentRef}
                className="relative overflow-auto flex-1 w-full"
                style={{ maxHeight: isVirtual ? '600px' : 'auto' }}
            >
                <div className="min-w-full">
                    <table className="w-full text-sm text-left">
                        <thead className="sticky top-0 z-10 bg-[hsl(var(--ui-muted))] border-b border-[hsl(var(--ui-border))]">
                            {table.getHeaderGroups().map((headerGroup) => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => {
                                        const isSorted = header.column.getIsSorted();
                                        return (
                                            <th
                                                key={header.id}
                                                colSpan={header.colSpan}
                                                className={cn(
                                                    'h-11 px-4 align-middle font-medium text-[hsl(var(--ui-text-muted))] select-none whitespace-nowrap',
                                                    header.column.getCanSort() ? 'cursor-pointer hover:text-[hsl(var(--ui-text))]' : ''
                                                )}
                                                onClick={header.column.getToggleSortingHandler()}
                                                aria-sort={isSorted === 'asc' ? 'ascending' : isSorted === 'desc' ? 'descending' : 'none'}
                                                scope="col"
                                            >
                                                {!header.isPlaceholder && (
                                                    <div className="flex items-center gap-2">
                                                        {flexRender(
                                                            header.column.columnDef.header,
                                                            header.getContext()
                                                        )}
                                                        {header.column.getCanSort() && (
                                                            <span className="flex items-center text-[hsl(var(--ui-text-subtle))] hover:text-[hsl(var(--ui-text))]">
                                                                {isSorted === 'asc' ? (
                                                                    <ArrowUp className="w-3 h-3" />
                                                                ) : isSorted === 'desc' ? (
                                                                    <ArrowDown className="w-3 h-3" />
                                                                ) : (
                                                                    <ArrowUpDown className="w-3 h-3" />
                                                                )}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </th>
                                        );
                                    })}
                                </tr>
                            ))}
                        </thead>
                        <tbody
                            className="divide-y divide-[hsl(var(--ui-border))]"
                            style={{
                                height: isVirtual ? `${rowVirtualizer.getTotalSize()}px` : 'auto',
                                position: 'relative',
                            }}
                        >
                            {isVirtual ? (
                                rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                    const row = rows[virtualRow.index];
                                    return (
                                        <tr
                                            key={row.id}
                                            className={cn(
                                                'group transition-colors absolute w-full flex items-center',
                                                onRowClick ? 'cursor-pointer hover:bg-[hsl(var(--ui-muted))]' : ''
                                            )}
                                            style={{
                                                top: 0,
                                                left: 0,
                                                height: `${virtualRow.size}px`,
                                                transform: `translateY(${virtualRow.start}px)`,
                                            }}
                                            onClick={() => onRowClick && onRowClick(row.original)}
                                        >
                                            {row.getVisibleCells().map((cell) => (
                                                <td
                                                    key={cell.id}
                                                    className="px-4 py-3 align-middle text-[hsl(var(--ui-text))] truncate flex-1"
                                                >
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })
                            ) : (
                                rows.map((row) => (
                                    <tr
                                        key={row.id}
                                        className={cn(
                                            'transition-colors hover:bg-black/5 dark:hover:bg-white/5',
                                            onRowClick ? 'cursor-pointer hover:bg-[hsl(var(--ui-muted))]' : ''
                                        )}
                                        onClick={() => onRowClick && onRowClick(row.original)}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <td
                                                key={cell.id}
                                                className="px-4 py-3 align-middle text-[hsl(var(--ui-text))]"
                                            >
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {data.length > 0 && <DataTablePagination table={table} />}
        </div>
    );
}
