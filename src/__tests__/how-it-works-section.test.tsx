import { describe, expect, it } from 'vitest';
import { HowItWorksSection } from '../ui/components/how-it-works-section';

describe('HowItWorksSection', () => {
    it('deve possuir a tag ID de ancora #como-funciona', () => {
        const result = HowItWorksSection();
        expect(result.props.id).toBe('como-funciona');
    });

    it('snapshot da estrutura', () => {
        const result = HowItWorksSection();
        expect(result).toMatchSnapshot();
    });
});
