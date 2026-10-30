import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { findModuleForPath, isModuleAuthorized } from '@/config/rbac';
import { ECOMMERCE_FRONTS } from '../../types';
import { EcommerceCockpitView, ecommerceHref, formatEcommerceDate } from '../CockpitView';
import { projectFixture, snapshotFixture } from './fixtures';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

describe('E-commerce cockpit presentation', () => {
    it('offers all six front links and transparent empty/commercial states', () => {
        const html = renderToStaticMarkup(<EcommerceCockpitView snapshot={snapshotFixture()} />);
        for (const front of ECOMMERCE_FRONTS) {
            expect(html).toContain(`href="/cockpit/gestao-ecommerce?frontCode=${front.code}"`);
            expect(html).toContain(front.name);
        }
        expect(html).toContain('Nenhum registro disponível');
        expect(html).toContain('Indisponíveis nesta etapa');
        expect(html).toContain('Última sincronização ClickUp: Não realizada');
        expect(html).not.toContain('R$');
        expect(html).not.toContain('Carregar exemplo demonstrativo');
        expect(html).not.toContain('name="workspaceId"');
    });

    it('shows the explicit administrative demo action only with configuration permission', () => {
        const html = renderToStaticMarkup(<EcommerceCockpitView snapshot={snapshotFixture({ permissions: { canConfigure: true } })} />);
        expect(html).toContain('Carregar exemplo demonstrativo');
        expect(html).toContain('Nenhum dado comercial é criado');
        expect(html).toContain('Configuração administrativa');
        expect(html).toContain('name="workspaceId"');
        expect(html).toContain('pattern="[0-9]+"');
        expect(html).not.toContain('90171032603');
    });

    it('keeps a demonstrated project outside the real active-project list and labels its source', () => {
        const project = projectFixture();
        const html = renderToStaticMarkup(<EcommerceCockpitView snapshot={snapshotFixture({ projects: [project], isDemo: true })} filters={{ frontCode: 'F02' }} />);
        expect(html).toContain('Demonstração');
        expect(html).toContain('Exemplo demonstrativo');
        expect(html).toContain('Não há projetos ativos reais autorizados');
        expect(html).toContain('href="/cockpit/gestao-ecommerce?frontCode=F02&amp;projectId=11111111-1111-4111-8111-111111111111"');
        expect(html).toContain('aria-current="page"');
    });

    it('renders project strategy, WBS, execution, history and evidence safely', () => {
        const project = projectFixture({
            blockers: ['Aguardando validação do diagnóstico.'], pendingDecisions: ['Definir lote inicial.'],
            evidence: ['javascript:alert(document.cookie)', 'https://example.com/evidence'],
            activities: [{ id: 'activity-1', taskId: 'task-1', occurredAt: '2026-10-31T01:00:00Z', type: 'Revisão', quantity: 20, description: 'Vinte anúncios revisados em ambiente demonstrativo.', evidence: [], responsible: 'Operador de teste', nextStep: 'Validar critérios' }],
            history: [{ id: 'event-1', taskId: 'task-1', type: 'status_changed', occurredAt: '2026-10-31T01:00:00Z', description: 'Projeto passou para Planejado.' }],
        });
        const html = renderToStaticMarkup(<EcommerceCockpitView snapshot={snapshotFixture({ projects: [project] })} filters={{ frontCode: 'F02', projectId: project.id }} />);
        expect(html).toContain('Projeto demonstrativo');
        expect(html).toContain('Hipótese de trabalho');
        expect(html).toContain(project.hypothesis);
        expect(html).toContain('Entregáveis · WBS / EAP');
        expect(html).toContain('Diagnóstico dos anúncios prioritários');
        expect(html).toContain('Quantidade executada: 20');
        expect(html).toContain('Projeto passou para Planejado.');
        expect(html).toContain('Aguardando validação do diagnóstico.');
        expect(html).toContain('Definir lote inicial.');
        expect(html).not.toContain('href="javascript:');
        expect(html).toContain('href="https://example.com/evidence"');
        expect(html).toContain('30/10/2026');
        expect(html).toContain('href="/cockpit/gestao-ecommerce?frontCode=F02"');
    });

    it('does not reveal whether an inaccessible project exists', () => {
        const html = renderToStaticMarkup(<EcommerceCockpitView snapshot={snapshotFixture()} filters={{ projectId: 'inaccessible-project' }} />);
        expect(html).toContain('O projeto não foi encontrado entre os registros autorizados');
        expect(html).not.toContain('CAT-001');
    });

    it('preserves project filters in links and uses Sao Paulo calendar dates', () => {
        expect(ecommerceHref({ frontCode: 'F02', projectId: 'project & more' })).toBe('/cockpit/gestao-ecommerce?frontCode=F02&projectId=project+%26+more');
        expect(formatEcommerceDate('2026-10-31T01:00:00Z')).toBe('30/10/2026');
        expect(formatEcommerceDate(null)).toBe('Não informado');
    });

    it.each(['admin', 'manager', 'operator', 'viewer'])('registers an explicit navigable module for %s', role => {
        const module = findModuleForPath('/cockpit/gestao-ecommerce');
        expect(module?.id).toBe('gestao-ecommerce');
        expect(isModuleAuthorized(module!, role, false).authorized).toBe(true);
    });
});
