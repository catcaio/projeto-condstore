'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { parseFiltersFromSearchParams, writeFiltersToUrl, clearFilters } from './url-state';
import { Button } from '@/ui/components/button';
import { Filter, X, Search } from 'lucide-react';
import { FilterDrawer } from './FilterDrawer';
import { SavedViews } from './SavedViews';
import { FilterSchema } from './filter-schema';

interface FilterBarProps<T extends Record<string, any>> {
    allowedKeys: string[];
    defaults?: Partial<T>;
    storageKey?: string;
    module?: 'audit' | 'acquisition' | 'acquisition_drilldown';
    searchPlaceholder?: string;
    // render function for drawer content
    drawerContent?: (localFilters: T, setLocalFilters: React.Dispatch<React.SetStateAction<T>>) => React.ReactNode;
    // render extra fast filters next to search
    fastFilters?: (filters: T, updateFilter: (key: keyof T, value: any) => void) => React.ReactNode;
}

export function FilterBar<T extends Record<string, any>>({
    allowedKeys,
    defaults,
    storageKey,
    module,
    searchPlaceholder = "Buscar por termo (q)...",
    drawerContent,
    fastFilters
}: FilterBarProps<T>) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [isDrawerOpen, setDrawerOpen] = useState(false);

    // Parse filters ensuring we strictly allow only allowed keys and defaults
    const filters = parseFiltersFromSearchParams<T>(searchParams, allowedKeys, defaults);

    const activeFilterKeys = Object.keys(filters).filter(k =>
        k !== 'q' && k !== 'page' && k !== 'limit' && k !== 'sort' && k !== 'order' &&
        filters[k] !== undefined && filters[k] !== '' &&
        (!defaults || filters[k] !== defaults[k])
    );

    // Debounce for search
    const [searchValue, setSearchValue] = useState(filters.q || '');
    const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

    // Sync input when URL changes outside
    useEffect(() => {
        setSearchValue(filters.q || '');
    }, [filters.q]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearchValue(val);

        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

        debounceTimeout.current = setTimeout(() => {
            const newFilters = { ...filters, q: val };
            delete (newFilters as any).page; // reset page to 1
            writeFiltersToUrl(router, pathname, newFilters, allowedKeys, defaults);
        }, 300);
    };

    const handleApplyFilters = (newFilters: T) => {
        const toApply = { ...newFilters };
        delete (toApply as any).page; // reset page to 1
        writeFiltersToUrl(router, pathname, toApply, allowedKeys, defaults);
    };

    const handleClearFilters = () => {
        // Clear everything but defaults
        writeFiltersToUrl(router, pathname, { ...defaults } as T, allowedKeys, defaults);
    };

    const handleRemoveFilter = (key: string) => {
        const newFilters = { ...filters };
        delete newFilters[key];
        delete (newFilters as any).page;
        writeFiltersToUrl(router, pathname, newFilters, allowedKeys, defaults);
    };

    const updateFilter = useCallback((key: keyof T, value: any) => {
        const newFilters = { ...filters };
        newFilters[key] = value;
        delete (newFilters as any).page; // reset page when filters change
        writeFiltersToUrl(router, pathname, newFilters, allowedKeys, defaults);
    }, [filters, router, pathname, allowedKeys, defaults]);

    return (
        <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--ui-text-muted))]" />
                    <input
                        className="w-full h-10 pl-9 pr-3 rounded-md border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] text-[hsl(var(--ui-text))] text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ui-accent-blue))] transition-shadow"
                        placeholder={searchPlaceholder}
                        value={searchValue}
                        onChange={handleSearchChange}
                    />
                </div>

                {fastFilters && fastFilters(filters, updateFilter)}

                <div className="flex items-center gap-2">
                    {drawerContent && (
                        <Button variant="secondary" onClick={() => setDrawerOpen(true)} className="gap-2 shrink-0">
                            <Filter className="w-4 h-4" />
                            Avançado {activeFilterKeys.length > 0 && `(${activeFilterKeys.length})`}
                        </Button>
                    )}

                    <SavedViews currentFilters={filters} storageKey={storageKey} module={module} onApplyView={(f) => {
                        handleApplyFilters(f);
                    }} />

                    {activeFilterKeys.length > 0 && (
                        <Button variant="ghost" className="text-[hsl(var(--ui-danger))] border border-[hsl(var(--ui-border))] hover:bg-red-500/10 shrink-0" onClick={handleClearFilters}>
                            Limpar Filtros
                        </Button>
                    )}
                </div>
            </div>

            {activeFilterKeys.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {activeFilterKeys.map(key => (
                        <div key={key} className="flex items-center gap-1.5 bg-[hsl(var(--ui-surface))] shadow-sm border border-[hsl(var(--ui-border))] px-3 py-1.5 rounded-full text-xs text-[hsl(var(--ui-text-muted))]">
                            <span className="font-semibold text-[hsl(var(--ui-text))]">{key}:</span>
                            <span className="max-w-[150px] truncate">{String((filters as any)[key])}</span>
                            <button
                                onClick={() => handleRemoveFilter(key)}
                                className="ml-1 text-[hsl(var(--ui-text-muted))] hover:text-[hsl(var(--ui-danger))] hover:bg-[hsl(var(--ui-muted))] rounded-full p-0.5 transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {drawerContent && (
                <FilterDrawer
                    isOpen={isDrawerOpen}
                    onClose={() => setDrawerOpen(false)}
                    currentFilters={filters}
                    onApply={handleApplyFilters}
                >
                    {drawerContent}
                </FilterDrawer>
            )}
        </div>
    );
}
