import { SettingsSection } from '@/ui/settings';
import { type AttributionSummaryRow } from '../queries';
import { AttributionRow } from './attribution-row';
import { AttributionEmptyState } from './empty-state';

export function AttributionTable({ items }: { items: AttributionSummaryRow[] }) {
    if (items.length === 0) {
        return <AttributionEmptyState />;
    }

    return (
        <SettingsSection title="Attribution Data">
            {items.map((item, index) => (
                <AttributionRow key={item.key} item={item} index={index} />
            ))}
        </SettingsSection>
    );
}
