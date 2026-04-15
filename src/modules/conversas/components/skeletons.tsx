import { SettingsSection, SettingsRow } from '@/ui/settings';

const SkeletonSkeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse rounded-md bg-[hsl(var(--ui-muted))] ${className}`} />
);

export function InboxListSkeleton() {
    return (
        <SettingsSection title="Timeline Operacional">
            {Array.from({ length: 10 }).map((_, i) => (
                <SettingsRow
                    key={i}
                    label={<SkeletonSkeleton className="h-4 w-48 mb-1" />}
                    description={<SkeletonSkeleton className="h-3 w-64" />}
                    value={<SkeletonSkeleton className="h-4 w-20" />}
                />
            ))}
        </SettingsSection>
    );
}
