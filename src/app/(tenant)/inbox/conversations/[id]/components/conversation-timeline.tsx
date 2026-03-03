import { SettingsSection } from '@/ui/settings';
import { type TimelineEvent } from '../queries';
import { TimelineItemRow } from './timeline-item';
import { ConversationEmptyState } from './empty-state';

export function ConversationTimeline({ items }: { items: TimelineEvent[] }) {
    if (items.length === 0) {
        return <ConversationEmptyState />;
    }

    return (
        <SettingsSection title="Timeline (Order ASC)">
            {items.map(item => (
                <TimelineItemRow key={item.id} item={item} />
            ))}
        </SettingsSection>
    );
}
