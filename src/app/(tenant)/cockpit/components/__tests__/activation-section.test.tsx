import { describe, it, expect, vi } from 'vitest';
import * as ReactDOMServer from 'react-dom/server';
import { ActivationSection } from '../activation-section';
import { getActivationMilestones } from '../../queries';

// Mocks
vi.mock('../../queries', () => ({
    getActivationMilestones: vi.fn(),
}));

describe('ActivationSection', () => {
    it('renders correctly with 0/5 milestones and shows Conectar loja CTA', async () => {
        (getActivationMilestones as any).mockResolvedValue({
            signup_created: false,
            store_connected: false,
            first_freight_simulation: false,
            first_whatsapp_message: false,
            cockpit_viewed: false,
        });

        // Since it's a Server Component we need to await it
        const Component = await ActivationSection({ tenantId: 't1' });
        const html = ReactDOMServer.renderToStaticMarkup(Component);

        expect(html).toContain('Ativação (0/5)');
        expect(html).toContain('Conectar loja</button>');
    });

    it('renders with 3/5 milestones and shows Fazer 1ª cotação CTA when store_connected is true', async () => {
        (getActivationMilestones as any).mockResolvedValue({
            signup_created: true,
            store_connected: true,
            first_freight_simulation: false,
            first_whatsapp_message: true,
            cockpit_viewed: false,
        });

        const Component = await ActivationSection({ tenantId: 't1' });
        const html = ReactDOMServer.renderToStaticMarkup(Component);

        expect(html).toContain('Ativação (3/5)');
        expect(html).toContain('Fazer 1ª cotação</button>');
    });

    it('renders with 5/5 milestones and no CTA', async () => {
        (getActivationMilestones as any).mockResolvedValue({
            signup_created: true,
            store_connected: true,
            first_freight_simulation: true,
            first_whatsapp_message: true,
            cockpit_viewed: true,
        });

        const Component = await ActivationSection({ tenantId: 't1' });
        const html = ReactDOMServer.renderToStaticMarkup(Component);

        expect(html).toContain('Ativação (5/5)');
        expect(html).not.toContain('Conectar loja</button>');
        expect(html).not.toContain('Fazer 1ª cotação</button>');
        expect(html).not.toContain('Enviar 1ª mensagem</button>');
    });
});
