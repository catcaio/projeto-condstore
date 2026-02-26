'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { FilterSchema } from './filter-schema';
import { parseFiltersFromSearchParams, writeFiltersToUrl, clearFilters } from './url-state';
import { Button } from '@/ui/components/button';
import { Filter, X, Search } from 'lucide-react';
import { FilterDrawer } from './FilterDrawer';
import { SavedViews } from './SavedViews';

export function FilterBar() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [isDrawerOpen, setDrawerOpen] = useState(false);
    const filters = parseFiltersFromSearchParams(searchParams);

    const activeFilterKeys = Object.keys(filters).filter(k => k !== 'q' && (filters as any)[k]);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const newFilters = { ...filters, q: value };
        writeFiltersToUrl(router, pathname, newFilters);
    };

    const handleApplyFilters = (newFilters: FilterSchema) => {
        writeFiltersToUrl(router, pathname, newFilters);
    };

    const handleClearFilters = () => {
        clearFilters(router, pathname);
    };

    const handleRemoveFilter = (key: string) => {
        const newFilters = { ...filters };
        delete (newFilters as any)[key];
        writeFiltersToUrl(router, pathname, newFilters);
    };

    return (
        <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--ui-text-muted))]" />
                    <input
                        className="w-full h-10 pl-9 pr-3 rounded-md border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] text-[hsl(var(--ui-text))] text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ui-accent-blue))] transition-shadow"
                        placeholder="Buscar por termo (q)..."
                        value={filters.q || ''}
                        onChange={handleSearch}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={() => setDrawerOpen(true)} className="gap-2 shrink-0">
                        <Filter className="w-4 h-4" />
                        Avançado {activeFilterKeys.length > 0 && `(${activeFilterKeys.length})`}
                    </Button>

                    <SavedViews currentFilters={filters} onApplyView={(f) => writeFiltersToUrl(router, pathname, f)} />

                    {Object.keys(filters).length > 0 && (
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
                            <span className="max-w-[150px] truncate">{(filters as Record<string, string>)[key]}</span>
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

            <FilterDrawer
                isOpen={isDrawerOpen}
                onClose={() => setDrawerOpen(false)}
                currentFilters={filters}
                onApply={handleApplyFilters}
            />
        </div>
    );
}
