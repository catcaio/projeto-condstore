import { SettingsSection, SettingsRow } from '@/ui/settings';

const SkeletonSkeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse rounded-md bg-[hsl(var(--ui-muted))] ${className}`} />
);

export function SimulationsListSkeleton() {
    return (
        <SettingsSection title="Simulações">
            {Array.from({ length: 10 }).map((_, i) => (
                <SettingsRow
                    key={i}
                    label={<SkeletonSkeleton className="h-4 w-48 mb-1" />}
                    description={<SkeletonSkeleton className="h-3 w-32" />}
                    value={<SkeletonSkeleton className="h-6 w-16 rounded-full" />}
                />
            ))}
        </SettingsSection>
    );
}

export function SimulationDetailSkeleton() {
    return (
        <div className="space-y-6">
            <SettingsSection title="Resumo">
                <SettingsRow label={<SkeletonSkeleton className="h-4 w-24" />} value={<SkeletonSkeleton className="h-4 w-32" />} />
                <SettingsRow label={<SkeletonSkeleton className="h-4 w-24" />} value={<SkeletonSkeleton className="h-4 w-32" />} />
                <SettingsRow label={<SkeletonSkeleton className="h-4 w-24" />} value={<SkeletonSkeleton className="h-4 w-32" />} />
            </SettingsSection>
        </div>
    );
}
