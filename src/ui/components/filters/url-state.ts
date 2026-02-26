import { ReadonlyURLSearchParams } from 'next/navigation';

export function parseFiltersFromSearchParams<T extends Record<string, string>>(
    searchParams: ReadonlyURLSearchParams | URLSearchParams,
    allowedKeys: string[],
    defaults?: Partial<T>
): T {
    const filters: any = { ...defaults };
    searchParams.forEach((value, key) => {
        if (allowedKeys.includes(key) && value.trim() !== '') {
            filters[key] = value;
        }
    });

    // Remove defaults if they match exactly to keep URL clean, but wait, parse doesn't write.
    // parse just returns the state.
    // If the URL has a value, it overrides default.
    return filters as T;
}

export function writeFiltersToUrl<T extends Record<string, any>>(
    router: any,
    pathname: string,
    filters: T,
    allowedKeys: string[],
    defaults?: Partial<T>
) {
    const params = new URLSearchParams();

    // Sort keys to maintain stable URL
    const sortedKeys = Object.keys(filters).sort();

    for (const key of sortedKeys) {
        if (allowedKeys.includes(key)) {
            const value = filters[key];
            const defaultValue = defaults ? defaults[key] : undefined;
            // Only set if value exists and is not the default
            // Wait, if it's default, should we remove it from URL? Yes, cleaner URL.
            // But wait, if someone removes a default, it will fall back to default again.
            // Let's just set it if it exists.
            if (value && typeof value === 'string' && value.trim() !== '') {
                // if it matches default, we can omit it if we want. Let's omit.
                if (value !== defaultValue) {
                    params.set(key, value);
                }
            }
        }
    }

    const queryString = params.toString();
    const newUrl = `${pathname}${queryString ? `?${queryString}` : ''}`;

    router.replace(newUrl, { scroll: false });
}

export function clearFilters(router: any, pathname: string) {
    router.replace(pathname, { scroll: false });
}
