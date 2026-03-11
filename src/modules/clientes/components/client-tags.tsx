import { StatusChip } from '@/ui/foundation';

export function ClientTags({ tags }: { tags: readonly string[] }) {
    return (
        <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
                <StatusChip key={tag} label={tag} tone="neutral" />
            ))}
        </div>
    );
}
