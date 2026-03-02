import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

import { GET as healthGET } from '@/app/api/tenants/[tenantId]/health/route';
import { GET as diagGET } from '@/app/api/internal/diag/route';
import { POST as qaSetupPOST } from '@/app/api/internal/qa/setup/route';
import { PUT as settingsPUT } from '@/app/api/tenants/[tenantId]/settings/route';

import * as trace from '@/infra/http/request-trace';

describe('Enforcement Definitivo - Teste de Invasão', () => {

    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('1. Chamar rota multi-tenant passando tenantId falso no body', async () => {
        const req = new NextRequest('http://localhost/api/tenants/LOJACOND/settings', {
            method: 'PUT',
            body: JSON.stringify({ tenantId: 'HACKED' })
        });

        // Executamos o Handler diretamente, simulando a chegada do fetch com payload malicioso
        const res = await settingsPUT(req, { params: Promise.resolve({ tenantId: 'LOJACOND' }) });

        // Sem a sessão auth real compatível com 'LOJACOND', o proxy orgânico ou o guard irão barrar
        // com 401 ou 403. Ele DEVE bloquear.
        expect([401, 403]).toContain(res.status);
    });

    it('2. Chamar /api/internal/* sem token', async () => {
        const req = new NextRequest('http://localhost/api/internal/diag', {
            method: 'GET'
        });

        const res = await diagGET(req, { params: Promise.resolve({}) });

        // A falta do header 'x-internal-token' aciona falha direta do requireInternalToken
        expect([401, 403]).toContain(res.status);
    });

    it('3. Chamar rota interna com token inválido', async () => {
        const req = new NextRequest('http://localhost/api/internal/qa/setup', {
            method: 'POST',
            headers: { 'x-internal-token': 'FALSO_E_INVALIDO' },
            body: JSON.stringify({})
        });

        const res = await qaSetupPOST(req, { params: Promise.resolve({}) });

        // O token é validado contra o process.env seguro. Fake falhará com 403.
        expect([401, 403]).toContain(res.status);
    });

    it('4. Spoofar header x-tenant-id', async () => {
        const req = new NextRequest('http://localhost/api/tenants/LOJACOND/health', {
            method: 'GET',
            headers: { 'x-tenant-id': 'OTHER_TENANT' }
        });

        const res = await healthGET(req, { params: Promise.resolve({ tenantId: 'LOJACOND' }) });

        // Incoerência de assinatura e falta de RBAC explícito bloqueia com Forbbiden
        expect([401, 403]).toContain(res.status);
    });

    it('5. Forçar 500 e garantir retorno JSON limpo (sem stack HTML)', async () => {
        // Simulando um crash inesperado forçado no momento de inicializar o processamento do request
        const spy = vi.spyOn(trace, 'makeRequestId').mockImplementation(() => {
            throw new Error('Simulated Backend Crash');
        });

        const req = new NextRequest('http://localhost/api/tenants/LOJACOND/health', { method: 'GET' });

        // O `withGlobalErrorInterceptor` capturará o erro
        const res = await healthGET(req, { params: Promise.resolve({ tenantId: 'LOJACOND' }) });

        expect(res.status).toBe(500);

        // Aseguramos que não está devolvendo HTML cru pro front-end
        expect(res.headers.get('content-type')).toContain('application/json');

        const data = await res.json();
        // Garantindo que PII e Call Stacks do backend não estão no payload final
        expect(data).toHaveProperty('error', 'internal_error');

        spy.mockRestore();
    });
});
