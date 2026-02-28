import { trackEvent } from '@/ui/lib/track';
import { ConceptVariantType } from './variants';

export function trackConceptCtaClick({ variant }: { variant: ConceptVariantType }) {
    if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.info('[Concept Layer] CTA Clicked. Payload:', { variant, experiment: 'concept-layer-ab' });
    }

    trackEvent({
        type: 'click_cta',
        page: 'concept_landing',
        section: 'hero',
        element: 'concept_primary_ab',
        metadata: {
            variant,
            experiment: 'concept-layer-ab',
        },
    });
}
