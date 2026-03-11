import { KPIStrip } from '@/ui/foundation';
import type { CockpitMetric } from '../data/shared';
import { cockpitMetrics } from '../mock-data';

export function OperationalKpiStrip({ items = cockpitMetrics }: { items?: CockpitMetric[] }) {
    return <KPIStrip items={items} />;
}
