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
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

const VirtualBody = dynamic(() => import('./DataTableVirtualBody'), { ssr: false }) as React.ComponentType<any>;

import { DataTableToolbar } from './DataTableToolbar';
import { DataTablePagination } from './DataTablePagination';
import { DataTableSkeleton } from './DataTableSkeleton';
import { DataTableEmpty } from './DataTableEmpty';
import { DataTableError } from './DataTableError';

export interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    initialSorting?: SortingState;
    sorting?: SortingState;
    onSortingChange?: (sorting: SortingState) => void;
    pagination?: { pageIndex: number; pageSize: number };
    onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void;
    pageCount?: number;
    manualPagination?: boolean;
    manualSorting?: boolean;
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
    sorting: controlledSorting,
    onSortingChange: setControlledSorting,
    pagination: controlledPagination,
    onPaginationChange: setControlledPagination,
    pageCount,
    manualPagination = false,
    manualSorting = false,
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
    const [internalSorting, setInternalSorting] = useState<SortingState>(initialSorting);
    const [internalPagination, setInternalPagination] = useState({ pageIndex: 0, pageSize: 20 });

    const sorting = controlledSorting !== undefined ? controlledSorting : internalSorting;
    const pagination = controlledPagination !== undefined ? controlledPagination : internalPagination;

    const table = useReactTable({
        data,
        columns,
        pageCount: manualPagination ? pageCount : undefined,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        manualPagination,
        manualSorting,
        onSortingChange: (updaterOrValue) => {
            const newSorting = typeof updaterOrValue === 'function' ? updaterOrValue(sorting) : updaterOrValue;
            if (setControlledSorting) {
                setControlledSorting(newSorting);
            } else {
                setInternalSorting(newSorting);
            }
        },
        onPaginationChange: (updaterOrValue) => {
            const newPagination = typeof updaterOrValue === 'function' ? updaterOrValue(pagination) : updaterOrValue;
            if (setControlledPagination) {
                setControlledPagination(newPagination);
            } else {
                setInternalPagination(newPagination);
            }
        },
        state: {
            sorting,
            pagination,
        },
    });

    const parentRef = React.useRef<HTMLDivElement>(null);
    const isVirtual = data.length > virtualizeThreshold;

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
                        {isVirtual ? (
                            <VirtualBody rows={rows} parentRef={parentRef} onRowClick={onRowClick} />
                        ) : (
                            <tbody className="divide-y divide-[hsl(var(--ui-border))]">
                                {rows.map((row) => (
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
                                ))}
                            </tbody>
                        )}
                    </table>
                </div>
            </div>
            {data.length > 0 && <DataTablePagination table={table} />}
        </div>
    );
}
