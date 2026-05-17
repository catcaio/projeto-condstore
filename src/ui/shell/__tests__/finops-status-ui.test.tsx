import * as React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FinOpsStatusUI } from '../finops-status-ui';

describe('FinOpsStatusUI', () => {
    it('does not render when unlocked', () => {
        const html = renderToStaticMarkup(<FinOpsStatusUI status="unlocked" />);
        expect(html).toBe('');
    });

    it('renders degraded preemptive state correctly', () => {
        const html = renderToStaticMarkup(<FinOpsStatusUI status="degraded_preemptive" />);
        expect(html).toContain('próximo ao limite');
        expect(html).toContain('Uso próximo ao limite');
    });

    it('renders degraded state correctly', () => {
        const html = renderToStaticMarkup(<FinOpsStatusUI status="degraded" />);
        expect(html).toContain('Soft Limit');
    });

    it('renders locked state correctly with correct CTA', () => {
        const html = renderToStaticMarkup(<FinOpsStatusUI status="locked" />);
        expect(html).toContain('Hard Limit');
        expect(html).toContain('href="/cockpit"');
        expect(html).toContain('Regularizar agora');
    });

    it('matches snapshot for unlocked', () => {
        expect(renderToStaticMarkup(<FinOpsStatusUI status="unlocked" />)).toMatchSnapshot();
    });

    it('matches snapshot for degraded_preemptive', () => {
        expect(renderToStaticMarkup(<FinOpsStatusUI status="degraded_preemptive" />)).toMatchSnapshot();
    });

    it('matches snapshot for degraded', () => {
        expect(renderToStaticMarkup(<FinOpsStatusUI status="degraded" />)).toMatchSnapshot();
    });

    it('matches snapshot for locked', () => {
        expect(renderToStaticMarkup(<FinOpsStatusUI status="locked" />)).toMatchSnapshot();
    });
});
