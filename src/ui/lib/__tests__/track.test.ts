import { describe, expect, it, vi } from 'vitest';
import { trackEvent } from '../track';

describe('trackEvent (Client)', () => {
    it('is SSR safe', () => {
        // window is not defined or manipulated here in basic Vitest without jsdom if we mock it
        global.window = undefined as any;
        expect(() => trackEvent({ type: 'view_section', page: 'test', section: 'test' })).not.toThrow();
    });

    it('filters out SSR calls automatically', () => {
        const fetchMock = vi.fn();
        global.fetch = fetchMock;
        global.window = undefined as any;

        trackEvent({ type: 'view_section', page: 'test', section: 'test' });
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
