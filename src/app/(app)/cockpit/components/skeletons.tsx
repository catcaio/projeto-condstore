import { SettingsSection, SettingsRow } from '@/ui/settings';

const SkeletonSkeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse rounded-md bg-[hsl(var(--ui-muted))] ${className}`} />
);

export function BillingSkeleton() {
    return (
        <SettingsSection title="Billing & Plan">
            <SettingsRow
                label={<SkeletonSkeleton className="h-4 w-32" />}
                description={<SkeletonSkeleton className="h-3 w-48" />}
                value={<SkeletonSkeleton className="h-4 w-12" />}
            />
        </SettingsSection>
    );
}

export function UsageSkeleton() {
    return (
        <SettingsSection title="Usage & FinOps">
            <SettingsRow
                label={<SkeletonSkeleton className="h-4 w-32" />}
                description={<SkeletonSkeleton className="h-3 w-48" />}
                value={<SkeletonSkeleton className="h-4 w-16" />}
            />
            <div className="px-4 pb-4 pt-2">
                <SkeletonSkeleton className="h-2 w-full rounded-full" />
                <div className="flex justify-between mt-2">
                    <SkeletonSkeleton className="h-3 w-24" />
                    <SkeletonSkeleton className="h-3 w-16" />
                </div>
            </div>
        </SettingsSection>
    );
}

export function FunnelSkeleton() {
    return (
        <SettingsSection title="Performance do Funil (Últimos 7 dias)">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-[hsl(var(--ui-border))]">
                <div className="flex flex-col gap-2 p-4">
                    <SkeletonSkeleton className="h-3 w-24 rounded" />
                    <SkeletonSkeleton className="h-6 w-12 rounded" />
                </div>
                <div className="flex flex-col gap-2 p-4">
                    <SkeletonSkeleton className="h-3 w-24 rounded" />
                    <SkeletonSkeleton className="h-6 w-12 rounded" />
                </div>
                <div className="flex flex-col gap-2 p-4">
                    <SkeletonSkeleton className="h-3 w-24 rounded" />
                    <SkeletonSkeleton className="h-6 w-12 rounded" />
                </div>
            </div>
        </SettingsSection>
    );
}

export function ActivitySkeleton() {
    return (
        <SettingsSection title="Atividade Recente">
            {Array.from({ length: 3 }).map((_, i) => (
                <SettingsRow
                    key={i}
                    label={<SkeletonSkeleton className="h-4 w-24" />}
                    description={<SkeletonSkeleton className="h-3 w-40" />}
                    value={<SkeletonSkeleton className="h-3 w-20" />}
                />
            ))}
        </SettingsSection>
    );
}
