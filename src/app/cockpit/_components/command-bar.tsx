'use client';

export default function CommandBar() {
    return (
        <div className="sticky top-0 z-10 w-full h-16 border-b border-[hsl(var(--cockpit-border))] bg-[hsl(var(--cockpit-bg))]/95 backdrop-blur flex items-center px-6 gap-4">
            <div className="flex-1 relative max-w-xl">
                <input
                    type="text"
                    placeholder="Comando... (Ctrl+K)"
                    className="w-full bg-[hsl(var(--cockpit-surface))] border border-[hsl(var(--cockpit-border))] rounded-md py-2 px-4 text-sm text-[hsl(var(--cockpit-text))] focus:outline-none focus:border-[hsl(var(--cockpit-accent))] focus:ring-1 focus:ring-[hsl(var(--cockpit-accent))] placeholder-[hsl(var(--cockpit-text-muted))]"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                    <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-medium text-[hsl(var(--cockpit-text-muted))] bg-[hsl(var(--cockpit-bg))] border border-[hsl(var(--cockpit-border))] rounded">
                        ⌘K
                    </kbd>
                </div>
            </div>
            <div className="ml-auto flex items-center gap-4">
                <div className="h-2 w-2 rounded-full bg-[hsl(var(--cockpit-accent))] shadow-[0_0_8px_hsl(var(--cockpit-accent))] animate-pulse"></div>
                <span className="text-xs font-medium text-[hsl(var(--cockpit-text-muted))] uppercase tracking-wider">
                    System Online
                </span>
            </div>
        </div>
    );
}
