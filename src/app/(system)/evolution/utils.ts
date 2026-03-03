export function debounce<T extends (...args: any[]) => void>(fn: T, ms = 200) {
    let timeoutId: ReturnType<typeof setTimeout>;
    return function (this: any, ...args: Parameters<T>) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), ms);
    };
}

export function parseTags(tagsStr: string | null | undefined): string[] {
    if (!tagsStr) return [];
    try {
        const parsed = JSON.parse(tagsStr);
        if (Array.isArray(parsed)) return parsed;
    } catch {
        // Not JSON
    }
    return tagsStr.split(',').map((t) => t.trim()).filter(Boolean);
}

export function getDateDaysAgo(days: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(0, 0, 0, 0);
    return d;
}

export function formatTimeRelative(dateStr: string | Date | number): string {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.max(0, now.getTime() - d.getTime());
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

export function cn(...classes: (string | undefined | null | false)[]): string {
    return classes.filter(Boolean).join(' ');
}
