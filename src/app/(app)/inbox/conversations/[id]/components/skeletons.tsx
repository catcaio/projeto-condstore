import { SettingsSection, SettingsRow } from '@/ui/settings';

const SkeletonSkeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse rounded-md bg-[hsl(var(--ui-muted))] ${className}`} />
);

export function ConversationTimelineSkeleton() {
    return (
        <SettingsSection title="Timeline">
            {Array.from({ length: 5 }).map((_, i) => (
                <SettingsRow
                    key={i}
                    label={<SkeletonSkeleton className="h-4 w-48 mb-1" />}
                    description={
                        <div className="flex flex-col gap-1 mt-1">
                            <SkeletonSkeleton className="h-3 w-32" />
                            <SkeletonSkeleton className="h-3 w-64" />
                        </div>
                    }
                    value={<SkeletonSkeleton className="h-4 w-12" />}
                />
            ))}
        </SettingsSection>
    );
}

export function ConversationHeaderSkeleton() {
    return (
        <div className="flex items-center gap-4 animate-pulse">
            <div className="h-10 w-10 rounded-full bg-[hsl(var(--ui-muted))]" />
            <div className="space-y-2">
                <div className="h-4 w-32 bg-[hsl(var(--ui-muted))] rounded" />
                <div className="h-3 w-48 bg-[hsl(var(--ui-muted))] rounded" />
            </div>
        </div>
    );
}
