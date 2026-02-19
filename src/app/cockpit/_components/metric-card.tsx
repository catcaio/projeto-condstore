import { cn } from "@/lib/utils"

interface MetricCardProps {
    title: string
    value: string | number
    subtext?: string
    isLoading?: boolean
    className?: string
}

export function MetricCard({ title, value, subtext, isLoading, className }: MetricCardProps) {
    return (
        <div className={cn(
            "rounded-lg border border-[hsl(var(--cockpit-border))] bg-[hsl(var(--cockpit-surface))] p-6 space-y-2",
            className
        )}>
            <h3 className="text-sm font-medium text-[hsl(var(--cockpit-text-muted))]">
                {title}
            </h3>

            {isLoading ? (
                <div className="h-8 w-24 animate-pulse bg-[hsl(var(--cockpit-border))] rounded" />
            ) : (
                <div className="text-3xl font-bold text-[hsl(var(--cockpit-text))]">
                    {value}
                </div>
            )}

            {subtext && (
                <p className="text-xs text-[hsl(var(--cockpit-text-muted))]">
                    {subtext}
                </p>
            )}
        </div>
    )
}
