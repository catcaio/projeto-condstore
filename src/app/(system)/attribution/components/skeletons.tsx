import { SettingsSection, SettingsRow } from '@/ui/settings';

const SkeletonSkeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse rounded-md bg-[hsl(var(--ui-muted))] ${className}`} />
);

export function AttributionSkeleton() {
    return (
        <SettingsSection title="Attribution Data">
            {Array.from({ length: 5 }).map((_, i) => (
                <SettingsRow
                    key={i}
                    label={<SkeletonSkeleton className="h-4 w-32 mb-1" />}
                    description={<SkeletonSkeleton className="h-3 w-48" />}
                    value={
                        <div className="flex flex-col items-end gap-1">
                            <SkeletonSkeleton className="h-4 w-12" />
                            <SkeletonSkeleton className="h-2 w-20 rounded-full" />
                        </div>
                    }
                />
            ))}
        </SettingsSection>
    );
}
