'use client';

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SharedKanbanBoard({
    children,
    className
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("flex h-full w-full items-start gap-4 overflow-x-auto pb-4 custom-scrollbar", className)}>
            {children}
        </div>
    );
}

export function KanbanColumn({
    title,
    count,
    color = "bg-[hsl(var(--ui-border))]",
    children,
    onDrop,
    id,
    className
}: {
    title: string;
    count?: number;
    color?: string;
    children: React.ReactNode;
    onDrop?: (itemType: string, itemId: string) => void;
    id: string;
    className?: string;
}) {
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const itemId = e.dataTransfer.getData('text/plain');
        const itemType = e.dataTransfer.getData('application/json');
        if (onDrop && itemId) {
            onDrop(itemType || 'card', itemId);
        }
    };

    return (
        <div 
            className={cn("flex w-[22rem] shrink-0 flex-col rounded-2xl bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border))] p-3 h-full max-h-full", className)}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <div className="mb-3 flex items-center justify-between px-1 shrink-0">
                <div className="flex items-center gap-2">
                    <div className={cn("h-3 w-3 rounded-full", color)} />
                    <h3 className="text-sm font-semibold tracking-tight text-[hsl(var(--ui-text))] uppercase">{title}</h3>
                </div>
                {count !== undefined && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-[hsl(var(--ui-page))] px-1.5 text-[10px] font-bold text-[hsl(var(--ui-text-muted))]">
                        {count}
                    </span>
                )}
            </div>
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto custom-scrollbar min-h-[150px] pb-4">
                {children}
            </div>
        </div>
    );
}

export function KanbanCard({
    id,
    type = 'card',
    children,
    className,
    onClick,
    isSelected,
    onSelectChange
}: {
    id: string;
    type?: string;
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    isSelected?: boolean;
    onSelectChange?: (checked: boolean) => void;
}) {
    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('text/plain', id);
        e.dataTransfer.setData('application/json', type);
        e.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div 
            draggable
            onDragStart={handleDragStart}
            onClick={onClick}
            className={cn(
                "group relative cursor-grab active:cursor-grabbing rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] p-3 shadow-sm hover:border-[hsl(var(--ui-accent-blue)/0.4)] hover:shadow-md transition-all duration-200", 
                isSelected && "border-[hsl(var(--ui-primary))] ring-1 ring-[hsl(var(--ui-primary))/30]",
                className
            )}
        >
            {onSelectChange && (
                <div className="absolute right-2 top-2 z-10" onClick={(e) => e.stopPropagation()}>
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => onSelectChange(e.target.checked)}
                        className={cn(
                            "h-4 w-4 rounded border-[hsl(var(--ui-border))] bg-transparent accent-[hsl(var(--ui-primary))] focus:ring-2 focus:ring-[hsl(var(--ui-primary))/50] focus:ring-offset-0 cursor-pointer transition-opacity",
                            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}
                        aria-label="Selecionar card"
                    />
                </div>
            )}
            {children}
        </div>
    );
}

export function DropdownStatusSelector({
    currentStatus,
    options,
    onChange,
    className
}: {
    currentStatus: { label: string; value: string; colorClass?: string };
    options: Array<{ label: string; value: string; colorClass?: string }>;
    onChange: (value: string) => Promise<void> | void;
    className?: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = async (val: string) => {
        setIsOpen(false);
        if (val === currentStatus.value) return;
        
        setIsUpdating(true);
        try {
            await onChange(val);
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className={cn("relative inline-block text-left", className)} ref={dropdownRef}>
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                disabled={isUpdating}
                className={cn(
                    "inline-flex items-center justify-between gap-1 w-full rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors focus:outline-none hover:opacity-80",
                    currentStatus.colorClass || "border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] text-[hsl(var(--ui-text-muted))]",
                    isUpdating && "opacity-50 cursor-wait"
                )}
            >
                <span className="truncate">{currentStatus.label}</span>
                <ChevronDown className="h-3 w-3 shrink-0 opacity-70" />
            </button>

            {isOpen && (
                <div className="absolute left-0 mt-1 z-[100] min-w-[160px] origin-top-left rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-1 shadow-lg ring-1 ring-black/5 focus:outline-none">
                    {options.map((option) => (
                        <button
                            key={option.value}
                            onClick={(e) => { e.stopPropagation(); handleSelect(option.value); }}
                            className={cn(
                                "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider transition-colors",
                                option.value === currentStatus.value ? "bg-[hsl(var(--ui-page))] font-bold text-[hsl(var(--ui-text))]" : "text-[hsl(var(--ui-text-muted))] hover:bg-[hsl(var(--ui-page))] hover:text-[hsl(var(--ui-text))]"
                            )}
                        >
                            <div className={cn("h-2 w-2 shrink-0 rounded-full", option.colorClass || "bg-gray-400")} />
                            <span className="truncate">{option.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
