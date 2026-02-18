interface MetricCardProps {
    label: string;
    value: string;
    trend?: string;
    trendUp?: boolean;
}

export default function MetricCard({ label, value, trend, trendUp }: MetricCardProps) {
    return (
        <div className="p-5 rounded-lg border border-[hsl(var(--cockpit-border))] bg-[hsl(var(--cockpit-surface))] hover:translate-y-[-2px] transition-transform duration-200">
            <h3 className="text-xs font-semibold text-[hsl(var(--cockpit-text-muted))] uppercase tracking-wider mb-2">
                {label}
            </h3>
            <div className="flex items-end justify-between">
                <span className="text-2xl font-bold text-[hsl(var(--cockpit-text))]">
                    {value}
                </span>
                {trend && (
                    <span
                        className={`text-xs font-medium px-2 py-0.5 rounded ${trendUp
                                ? 'text-[hsl(var(--cockpit-accent))] bg-[hsl(var(--cockpit-accent))]/10'
                                : 'text-[hsl(var(--cockpit-danger))] bg-[hsl(var(--cockpit-danger))]/10'
                            }`}
                    >
                        {trend}
                    </span>
                )}
            </div>
        </div>
    );
}
