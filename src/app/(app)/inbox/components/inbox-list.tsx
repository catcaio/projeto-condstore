import { SettingsSection } from '@/ui/settings';
import { type InboxItem } from '../queries';
import { InboxItemRow } from './inbox-item-row';
import { InboxEmptyState } from './empty-state';

export function InboxList({ items }: { items: InboxItem[] }) {
    if (items.length === 0) {
        return <InboxEmptyState />;
    }

    return (
        <SettingsSection title="Timeline Operacional">
            {items.map((item) => (
                <InboxItemRow key={item.id} item={item} />
            ))}
        </SettingsSection>
    );
}
