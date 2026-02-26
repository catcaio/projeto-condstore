'use client';

import React from 'react';
import { flexRender, Row } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';

export interface VirtualBodyProps<TData> {
    rows: Row<TData>[];
    parentRef: React.RefObject<HTMLDivElement | null>;
    onRowClick?: (row: TData) => void;
}

export default function DataTableVirtualBody<TData>({ rows, parentRef, onRowClick }: VirtualBodyProps<TData>) {
    const rowVirtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 48,
        overscan: 10,
    });

    return (
        <tbody
            className="divide-y divide-[hsl(var(--ui-border))]"
            style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                position: 'relative',
                display: 'block'
            }}
        >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
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
            })}
        </tbody>
    );
}
