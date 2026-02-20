"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { FilterState, TimeRange, ProjectReport } from './types';
import { parseTags, getDateDaysAgo } from './utils';

const DEFAULT_STATE: FilterState = {
    q: '',
    range: '30d',
    modules: [],
    statuses: [],
    tags: [],
    groupTimeline: 'day',
    compactMode: true,
    autoRefresh: true,
};

export function useDashboardState(initialReports: ProjectReport[]) {
    const searchParams = useSearchParams();
    const router = useRouter();

    const [state, setState] = useState<FilterState>(() => {
        const modules = searchParams.get('module') ? searchParams.get('module')!.split(',') : [];
        const statuses = searchParams.get('status') ? searchParams.get('status')!.split(',') : [];
        const tags = searchParams.get('tags') ? searchParams.get('tags')!.split(',') : [];
        return {
            q: searchParams.get('q') || '',
            range: (searchParams.get('range') as TimeRange) || DEFAULT_STATE.range,
            modules,
            statuses,
            tags,
            groupTimeline: (searchParams.get('group') as any) || DEFAULT_STATE.groupTimeline,
            compactMode: searchParams.get('compact') === 'false' ? false : DEFAULT_STATE.compactMode,
            autoRefresh: searchParams.get('refresh') === 'false' ? false : DEFAULT_STATE.autoRefresh,
        };
    });

    // Debounced URL sync
    useEffect(() => {
        const delay = setTimeout(() => {
            const params = new URLSearchParams();
            if (state.q) params.set('q', state.q);
            if (state.range !== '30d') params.set('range', state.range);
            if (state.modules.length) params.set('module', state.modules.join(','));
            if (state.statuses.length) params.set('status', state.statuses.join(','));
            if (state.tags.length) params.set('tags', state.tags.join(','));
            if (state.groupTimeline !== 'day') params.set('group', state.groupTimeline);
            if (!state.compactMode) params.set('compact', 'false');
            if (!state.autoRefresh) params.set('refresh', 'false');

            const query = params.toString();
            const url = query ? `?${query}` : window.location.pathname;
            router.replace(url, { scroll: false });
        }, 300);
        return () => clearTimeout(delay);
    }, [state, router]);

    const updateState = useCallback((updates: Partial<FilterState>) => {
        setState((prev) => ({ ...prev, ...updates }));
    }, []);

    const toggleArrayItem = useCallback((key: 'modules' | 'statuses' | 'tags', value: string) => {
        setState((prev) => {
            const arr = prev[key];
            return {
                ...prev,
                [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]
            };
        });
    }, []);

    // Derived Data
    const filteredReports = useMemo(() => {
        const days = parseInt(state.range.replace('d', ''), 10);
        const cutoff = getDateDaysAgo(days).getTime();

        const loweredQ = state.q.toLowerCase();

        return initialReports.filter((r) => {
            const rTime = new Date(r.created_at).getTime();
            if (rTime < cutoff) return false;

            if (state.modules.length && !state.modules.includes(r.module_key)) return false;
            if (state.statuses.length && !state.statuses.includes(r.status)) return false;

            if (state.tags.length) {
                const rTags = parseTags(r.tags);
                if (!state.tags.some(t => rTags.includes(t))) return false;
            }

            if (state.q) {
                const text = `${r.title} ${r.summary} ${r.module_key} ${r.changes || ''} ${r.next_actions || ''}`.toLowerCase();
                if (!text.includes(loweredQ)) return false;
            }

            return true;
        });
    }, [initialReports, state]);

    // Unique extraction for filters
    const allModules = useMemo(() => [...new Set(initialReports.map(r => r.module_key))].sort(), [initialReports]);
    const allTags = useMemo(() => {
        const set = new Set<string>();
        initialReports.forEach(r => parseTags(r.tags).forEach(t => set.add(t)));
        return [...set].sort();
    }, [initialReports]);

    return {
        state,
        updateState,
        toggleArrayItem,
        filteredReports,
        allModules,
        allTags,
    };
}
