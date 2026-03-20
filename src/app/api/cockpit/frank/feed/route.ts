import { NextRequest, NextResponse } from 'next/server';
import { ecosystemFeedService } from '@/modules/frank/server';
import { logger } from '@/infra/logger';
import { requireAdmin } from '@/infra/auth/guards';
import { crmRepository } from '@/modules/crm/server';

export async function POST(req: NextRequest) {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;
    const tenantId = auth.session.tenantId;

    try {

        const body = await req.json();
        const { message, context } = body;
        
        logger.info('Frank Global request received', { tenantId, message, moduleContext: context?.module });

        const lowercaseMsg = (message || '').toLowerCase().trim();

        // Use Case 1: "o que mudou hoje na main?"
        if (lowercaseMsg.includes('mudou') || lowercaseMsg.includes('main') || lowercaseMsg.includes('deploy')) {
            const feed = await ecosystemFeedService.getRecentFeed(tenantId, 5);
            let reply = `**Atualizações do Ecossistema Lojacond:**\n\n`;
            
            const suggestions: Array<{ label: string, actionUrl: string }> = [];

            if (feed.length > 0) {
                feed.forEach(f => {
                    const badge = f.impactCategory === 'technical' ? '🔧 TÉCNICO' 
                                : f.impactCategory === 'risk' ? '⚠️ RISCO' 
                                : f.impactCategory === 'commercial' ? '💰 COMERCIAL' 
                                : '📦 OPERAÇÃO';
                    reply += `• [${badge}] \`${f.eventType}\`: ${f.description}\n`;
                    if (f.suggestedAction) {
                        suggestions.push(f.suggestedAction);
                    }
                });
            } else {
                reply += `*O sistema está estável. Não detectei deploys estruturais recentes ou novos eventos operacionais na última hora.*`;
            }

            return NextResponse.json({ reply, suggestions });
        }

        // Use Case 2: "isso afeta qual módulo?"
        if (lowercaseMsg.includes('afeta') || lowercaseMsg.includes('impacto')) {
            return NextResponse.json({ 
                reply: `Como assistente sistêmico, analiso que alterações recentes de código normalmente afetam as views principais (**Conversas, Pedidos, Logística**). Se notar instabilidade, verifique esses módulos primeiro.`,
                suggestions: [{ label: 'Revisar Módulo de Conversas', actionUrl: '/cockpit/conversas' }]
            });
        }

        // Use Case 3 & 4: "qual a prioridade da operação agora?" / "o que está travando hoje?"
        if (lowercaseMsg.includes('prioridade') || lowercaseMsg.includes('travando') || lowercaseMsg.includes('gargalo')) {
            return NextResponse.json({ 
                 reply: `**Análise Preditiva Lojacond:**\n\nNeste momento a prioridade é zerar a **Fila Operacional de Mensagens do WhatsApp** (módulo Atendimento). Os eventos indicam leads recentes que aguardam cotação final.\n\nSugiro que navegue até \`/conversas\` para desafogar o volume primário de aquisição.`,
                 suggestions: [{ label: 'Desafogar WhatsApp Inbound', actionUrl: '/conversas' }]
            });
        }

        // Use Case: Commercial Pulse
        if (lowercaseMsg.includes('quente') || lowercaseMsg.includes('frio') || lowercaseMsg.includes('lead') || lowercaseMsg.includes('oportunidade') || lowercaseMsg.includes('pipeline') || lowercaseMsg.includes('negócio')) {
            const ops = await crmRepository.listRecentOpportunities(tenantId, 5);
            let reply = `**Análise de Pipeline (Oportunidades recentes):**\n\n`;
            if (ops.length === 0) {
                reply += `Não encontrei oportunidades ativas. O balde está frio.`;
            } else {
                ops.forEach(op => {
                    const status = (op.stage === 'new_lead' || op.stage === 'qualified') ? '🔥 Quente (Fase Inicial)' : (op.stage === 'won' ? '✅ Ganho' : (op.stage === 'lost' ? '❌ Perdido' : '⚡ Em andamento'));
                    reply += `• [${status}] R$ ${op.amount || '0'} - ${op.title}\n`;
                });
            }
            return NextResponse.json({ reply, suggestions: [{ label: 'Ver Funil de Clientes', actionUrl: '/clientes' }] });
        }

        // Use Case: Follow-ups
        if (lowercaseMsg.includes('follow-up') || lowercaseMsg.includes('retornar') || lowercaseMsg.includes('pendente') || lowercaseMsg.includes('agendamento')) {
            const followUps = await crmRepository.listPendingFollowUps(tenantId, 3);
                
            let reply = `**Ações de Retorno Pendentes:**\n\n`;
            if (followUps.length === 0) {
                reply += `Nenhum follow-up atrasado ou agendado para hoje. Operação limpa!`;
            } else {
                followUps.forEach(f => {
                    reply += `• ⏰ Agendado para ${f.scheduledAt.toLocaleDateString('pt-BR')}: ${f.description}\n`;
                });
            }
            return NextResponse.json({ reply, suggestions: [{ label: 'Ver Funil de Clientes', actionUrl: '/clientes' }] });
        }

        // Use Case 5: Contextual Summaries
        if (lowercaseMsg.includes('resuma') || lowercaseMsg.includes('contexto')) {
            let contextReply = `Lendo o seu contexto no momento...\n\n`;
            let contextSuggestions = [];
            
            if (context?.module === 'conversas') {
                if (context?.entityId) {
                    contextReply += `**Contexto Atual:** Você está no SLA da conversa \`${context.entityId}\`.\nEsta é a tela de resolução individual. Para avançar, colete as intenções do lead ou envie um link de pagamento.`;
                    contextSuggestions.push({ label: 'Gerar Link de Pagamento', actionUrl: `/cockpit/conversas/${context.entityId}` });
                } else {
                    contextReply += `**Contexto Atual:** Você está visualizando o Inbound de Conversas (WhatsApp) no Cockpit.\nSugestão: priorizar os casos marcados com alta probabilidade de fechamento.`;
                }
            } else if (context?.module === 'pedidos') {
                if (context?.entityId) {
                    contextReply += `**Contexto Atual:** Você está dentro dos detalhes do pedido \`${context.entityId}\`.\nVerifique imediatamente a aba de logística para confirmar a previsão e código de rastreamento.`;
                    contextSuggestions.push({ label: 'Revisar Logística Atrelada', actionUrl: `/cockpit/logistica` });
                } else {
                    contextReply += `**Contexto Atual:** Visão da lista de Pedidos.\nA fila de pedidos foi ajustada para consumir puramente o banco central Drizzle sem dados de rascunhos imprecisos.`;
                }
            } else if (context?.module === 'clientes') {
                contextReply += `**Contexto Atual:** Você está navegando na listagem unificada de Clientes CRM.\nAqui você monitora LTV e saúde dos clientes que geraram transações através do WhatsApp.`;
            } else if (context?.module === 'logistica') {
                contextReply += `**Contexto Atual:** Mesa de Logística Geral.\nAs cotações do Frank criadas durante os fluxos E2E acabam desaguando neste painel. Fique de olho nos envios que estão fora de prazo estimado (SLA quebrado).`;
            } else {
                contextReply += `**Contexto Atual:** ${context?.readableContext || "Visão Geral do Cockpit"}.`;
            }

            return NextResponse.json({ reply: contextReply, suggestions: contextSuggestions });
        }
        
        // Fallback Base (Direct QA without LLM integration yet, strictly deterministic per Scope 6 Rules)
        return NextResponse.json({ 
            reply: `Ainda estou aprendendo e processando algumas requisições! Como sou o **Assistente de Sistema Global**, você pode me perguntar coisas como:\n\n- *"O que mudou hoje na main?"*\n- *"Quais são os leads mais quentes?"*\n- *"Temos follow-ups atrasados?"*\n- *"Resuma meu contexto!"*` 
        });

    } catch (error) {
        logger.error('Error serving global Frank prompt response', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
