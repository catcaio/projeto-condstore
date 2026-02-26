import { ReadonlyURLSearchParams } from 'next/navigation';
import { FilterSchema } from './filter-schema';

export function parseFiltersFromSearchParams(searchParams: ReadonlyURLSearchParams | URLSearchParams): FilterSchema {
    const filters: any = {};
    searchParams.forEach((value, key) => {
        if (value.trim() !== '') {
            filters[key] = value;
        }
    });
    return filters as FilterSchema;
}

export function writeFiltersToUrl(router: any, pathname: string, filters: FilterSchema) {
    const params = new URLSearchParams();

    // Sort keys to maintain stable URL
    const sortedKeys = Object.keys(filters).sort();

    for (const key of sortedKeys) {
        const value = (filters as any)[key];
        if (value && typeof value === 'string' && value.trim() !== '') {
            params.set(key, value);
        }
    }

    const queryString = params.toString();
    const newUrl = `${pathname}${queryString ? `?${queryString}` : ''}`;

    router.replace(newUrl, { scroll: false });
}

export function clearFilters(router: any, pathname: string) {
    router.replace(pathname, { scroll: false });
}
