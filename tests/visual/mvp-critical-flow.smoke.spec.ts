import { test, expect } from '@playwright/test';

test.describe('MVP Critical Flow Smoke - mensagem → cotação → aprovação → pedido → logística', () => {
    test('executa fluxo piloto completo na interface do atendimento', async ({ page }) => {
        const conversationId = 'conv-smoke-001';
        const quoteId = 'quote-smoke-001';
        const orderId = 'order-smoke-001';

        let quoteStatus: 'NONE' | 'DRAFT' | 'SENT' | 'ACCEPTED' | 'CONVERTED' = 'NONE';
        let orderStatus: 'NONE' | 'DRAFT' | 'CONFIRMED' = 'NONE';

        const messages: Array<{ id: string; direction: 'INBOUND' | 'OUTBOUND'; source: string; message: string; createdAt: string }> = [
            {
                id: 'msg-1',
                direction: 'INBOUND',
                source: 'whatsapp',
                message: 'Olá, preciso de cotação para entrega em SP.',
                createdAt: '2026-03-30T10:00:00.000Z',
            },
        ];

        const conversations = [
            {
                id: conversationId,
                phoneHash: 'cafe1234deadbeef',
                phone: '+55 11 98888-7777',
                status: 'OPEN',
                stage: 'QUALIFYING',
                lastMessageAt: '2026-03-30T10:00:00.000Z',
                customer: { name: 'Cliente Piloto MVP' },
                frankSession: {
                    currentIntent: 'cotacao_frete',
                    currentStep: 'aguardando_proposta',
                    contextJson: { activeProduct: 'Envio expresso' },
                },
            },
        ];

        const buildQuotes = () => {
            if (quoteStatus === 'NONE') return [];
            return [
                {
                    id: quoteId,
                    bestPrice: '89.90',
                    bestCarrier: 'transportadora alfa',
                    bestService: 'rodoviario',
                    weight: '7.2',
                    createdAt: '2026-03-30T10:04:00.000Z',
                    status: quoteStatus,
                },
            ];
        };

        const buildOrders = () => {
            if (orderStatus === 'NONE') return [];
            return [
                {
                    id: orderId,
                    status: orderStatus,
                    price: '89.90',
                },
            ];
        };

        // Generate valid JWT signed token for the smoke test session
        const { SignJWT } = await import('jose');
        const secret = new TextEncoder().encode(process.env.AUTH_SECRET || 'dev-only-fallback-secret-do-not-use-in-prod');
        const validToken = await new SignJWT({ tenantId: 'tenant-smoke', role: 'admin' })
            .setProtectedHeader({ alg: 'HS256' })
            .setSubject('user-smoke')
            .setExpirationTime('24h')
            .sign(secret);

        await page.context().addCookies([{
            name: 'condstore_session',
            value: validToken,
            domain: 'localhost',
            path: '/',
        }]);

        await page.route('**/api/cockpit/**', async (route) => {
            const req = route.request();
            const url = new URL(req.url());
            const method = req.method();
            const pathname = url.pathname;

            if (pathname === '/api/cockpit/conversations' && method === 'GET') {
                await route.fulfill({ status: 200, json: { ok: true, data: conversations } });
                return;
            }

            if (pathname === `/api/cockpit/conversations/${conversationId}` && method === 'GET') {
                await route.fulfill({
                    status: 200,
                    json: {
                        ok: true,
                        data: {
                            conversation: conversations[0],
                            messages,
                        },
                    },
                });
                return;
            }

            if (pathname === `/api/cockpit/conversations/${conversationId}/message` && method === 'POST') {
                const body = req.postDataJSON() as { message?: string };
                messages.push({
                    id: `msg-${messages.length + 1}`,
                    direction: 'OUTBOUND',
                    source: 'operator',
                    message: body.message || '',
                    createdAt: '2026-03-30T10:01:30.000Z',
                });
                await route.fulfill({ status: 200, json: { ok: true } });
                return;
            }

            if (pathname === `/api/cockpit/conversations/${conversationId}/quotes` && method === 'GET') {
                await route.fulfill({ status: 200, json: { ok: true, data: buildQuotes() } });
                return;
            }

            if (pathname === `/api/cockpit/conversations/${conversationId}/quotes` && method === 'POST') {
                quoteStatus = 'DRAFT';
                await route.fulfill({ status: 200, json: { ok: true, data: { id: quoteId } } });
                return;
            }

            if (pathname === `/api/cockpit/conversations/${conversationId}/quotes/${quoteId}/send` && method === 'POST') {
                quoteStatus = 'SENT';
                await route.fulfill({ status: 200, json: { ok: true } });
                return;
            }

            if (pathname === `/api/cockpit/conversations/${conversationId}/quotes/${quoteId}/accept` && method === 'POST') {
                quoteStatus = 'ACCEPTED';
                await route.fulfill({ status: 200, json: { ok: true } });
                return;
            }

            if (pathname === `/api/cockpit/conversations/${conversationId}/quotes/${quoteId}/order` && method === 'POST') {
                quoteStatus = 'CONVERTED';
                orderStatus = 'DRAFT';
                await route.fulfill({ status: 200, json: { ok: true, data: { id: orderId } } });
                return;
            }

            if (pathname === '/api/cockpit/orders' && method === 'GET') {
                await route.fulfill({ status: 200, json: { ok: true, data: buildOrders() } });
                return;
            }

            if (pathname === `/api/cockpit/orders/${orderId}/status` && method === 'PATCH') {
                orderStatus = 'CONFIRMED';
                await route.fulfill({ status: 200, json: { ok: true } });
                return;
            }

            if (pathname === `/api/cockpit/orders/${orderId}/shipment` && method === 'GET') {
                if (orderStatus === 'CONFIRMED') {
                    await route.fulfill({
                        status: 200,
                        json: {
                            ok: true,
                            data: {
                                id: 'ship-smoke-001',
                                status: 'in_transit',
                                carrier: 'transportadora alfa',
                                trackingCode: 'BR1234567890',
                                trackingUrl: 'https://tracking.example/BR1234567890',
                            },
                        },
                    });
                    return;
                }

                await route.fulfill({ status: 200, json: { ok: true, data: null } });
                return;
            }

            // fallback para painéis auxiliares do cockpit
            await route.fulfill({ status: 200, json: { ok: true, data: [] } });
        });

        await page.goto('/cockpit/atendimento');

        await expect(page.getByText('Caixa de Entrada')).toBeVisible();
        await page.getByText('cafe1234...').click();

        // Mensagem
        await page.getByPlaceholder('Digite sua mensagem ao cliente...').fill('Perfeito! Vou simular o frete e te retorno agora.');
        await page.getByPlaceholder('Digite sua mensagem ao cliente...').press('Enter');
        await expect(page.getByText('Perfeito! Vou simular o frete e te retorno agora.')).toBeVisible();

        // Abrir painel de contexto em viewport desktop padrão (<2xl)
        await page.getByRole('button', { name: /Painel de Contexto/i }).click();
        await expect(page.getByRole('heading', { name: 'Cotação de Frete' })).toBeVisible();

        // Cotação
        await page.getByRole('button', { name: /Nova/i }).click();
        await page.locator('label:has-text("CEP Destino") + input').fill('01310100');
        await page.locator('label:has-text("Peso (kg)") + input').fill('7.2');
        await page.getByRole('button', { name: 'Simular' }).click();
        await expect(page.getByText(/Cota[cç][aã]o registrada/i)).toBeVisible();

        // Aprovação supervisionada
        await page.getByRole('button', { name: /Enviar no WhatsApp|Enviar/i }).click();
        await expect(page.getByText(/Cota[cç][aã]o enviada/i).first()).toBeVisible();
        await page.getByRole('button', { name: 'Registrar aprovacao' }).click();
        await expect(page.getByText(/Aprova[cç][aã]o registrada/i).first()).toBeVisible();

        // Pedido
        await page.getByRole('button', { name: /Gerar pedido DRAFT|Criar pedido/i }).click();
        await expect(page.getByText(/Pedido em DRAFT criado|Pedido criado/i)).toBeVisible();
        await expect(page.getByText(/Pedido DRAFT gerado|Pedido Gerado/i)).toBeVisible();

        // Logística
        await page.getByRole('button', { name: /Confirmar pedido e abrir shipment/i }).click();
        await expect(page.getByText('Pedido confirmado').first()).toBeVisible();
        await expect(page.getByText('BR1234567890')).toBeVisible();
    });
});
