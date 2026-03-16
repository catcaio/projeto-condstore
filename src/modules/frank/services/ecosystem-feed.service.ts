import { getDb } from '@/infra/db';
import { operationalEvents } from '@/drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import { logger } from '@/infra/logger';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export type ImpactCategory = 'technical' | 'operational' | 'commercial' | 'risk';

export interface SuggestedAction {
    label: string;
    actionUrl: string;
}

export interface EcosystemFeedItem {
    id: string;
    eventType: string;
    eventDomain: string;
    createdAt: string;
    description: string;
    impactCategory: ImpactCategory;
    suggestedAction?: SuggestedAction;
}

function formatEventContext(event: typeof operationalEvents.$inferSelect): EcosystemFeedItem {
    const payload = event.payload as Record<string, any> || {};
    let description = `Evento '${event.eventType}' detectado no módulo de ${event.eventDomain}.`;
    let impactCategory: ImpactCategory = 'operational';
    let suggestedAction: SuggestedAction | undefined;

    switch (event.eventType) {
        case 'new_lead_captured':
            description = `Novo lead capturado no WhatsApp (${payload.source || 'Desconhecido'}). Impacto direto no pipeline de aquisição.`;
            impactCategory = 'commercial';
            suggestedAction = { label: 'Tratar Conversa Pendente', actionUrl: '/cockpit/conversas' };
            break;
        case 'product_detected':
            description = `Cliente interagiu com o catálogo de produtos e demonstrou intenção de compra.`;
            impactCategory = 'commercial';
            suggestedAction = { label: 'Ver Clientes Ativos', actionUrl: '/cockpit/clientes' };
            break;
        case 'freight_quoted':
            description = `Cotação de frete automática (CEP ${payload.destinationZip}). Valor: R$ ${payload.freightPrice}.`;
            impactCategory = 'operational';
            suggestedAction = { label: 'Revisar Logística', actionUrl: '/cockpit/logistica' };
            break;
        case 'suggestion_created':
            description = `O Frank gerou novas sugestões de resposta para a operação de Atendimento.`;
            impactCategory = 'operational';
            suggestedAction = { label: 'Aprovar Sugestões', actionUrl: '/cockpit/conversas' };
            break;
        case 'security_anomaly':
            description = `Risco Operacional: Mudanças bruscas de permissão ou eventos atípicos identificados.`;
            impactCategory = 'risk';
            break;
    }

    return {
        id: event.id,
        eventType: event.eventType,
        eventDomain: event.eventDomain,
        createdAt: event.createdAt.toISOString(),
        description,
        impactCategory,
        suggestedAction
    };
}

function getLatestCommitInfo(): EcosystemFeedItem | null {
    try {
        let commitMsg = process.env.VERCEL_GIT_COMMIT_MESSAGE;
        let commitSha = process.env.VERCEL_GIT_COMMIT_SHA;

        if (!commitMsg) {
            // Se não estiver na Vercel, tenta pegar do git local
            try {
                const gitLog = execSync('git log -1 --format="%H|%s"').toString().trim();
                const [sha, msg] = gitLog.split('|');
                commitSha = sha;
                commitMsg = msg;
            } catch (e) {
                return null; // Git não disponível
            }
        }

        if (commitMsg && commitSha) {
            const shortSha = commitSha.substring(0, 7);
            return {
                id: `commit-${shortSha}`,
                eventType: 'system_deploy',
                eventDomain: 'system',
                createdAt: new Date().toISOString(), // Idealmente o date do commit, mas date atual serve pra pinar no topo
                description: `Último Deploy/Commit detectado na main (${shortSha}): "${commitMsg}".`,
                impactCategory: 'technical',
                suggestedAction: undefined // Apenas informativo
            };
        }
    } catch {
       return null;
    }
    return null;
}

function getLatestMigrationInfo(): EcosystemFeedItem | null {
    try {
        const journalPath = path.join(process.cwd(), 'drizzle', 'meta', '_journal.json');
        if (fs.existsSync(journalPath)) {
            const content = fs.readFileSync(journalPath, 'utf8');
            const journal = JSON.parse(content);
            if (journal && journal.entries && journal.entries.length > 0) {
                const lastEntry = journal.entries[journal.entries.length - 1];
                return {
                    id: `migration-${lastEntry.idx}`,
                    eventType: 'db_migration',
                    eventDomain: 'database',
                    createdAt: new Date(lastEntry.when).toISOString(),
                    description: `Estrutura de banco de dados atualizada: migração ${lastEntry.tag} aplicada com sucesso.`,
                    impactCategory: 'technical',
                    suggestedAction: undefined
                };
            }
        }
    } catch (error) {
        logger.error('Failed to read _journal.json', error instanceof Error ? error : new Error(String(error)));
    }
    return null;
}

export const ecosystemFeedService = {
    async getRecentFeed(tenantId: string, limit: number = 20): Promise<EcosystemFeedItem[]> {
        logger.info('Ecosystem Feed Requested', { tenantId, action: 'getRecentFeed' });

        try {
            const db = await getDb();
            const rawEvents = await db.select()
                .from(operationalEvents)
                .where(eq(operationalEvents.tenantId, tenantId))
                .orderBy(desc(operationalEvents.createdAt))
                .limit(limit);

            let feed: EcosystemFeedItem[] = rawEvents.map(formatEventContext);

            // Injetar fontes reais assíncronamente/síncronamente seguras
            const commitInfo = getLatestCommitInfo();
            const migrationInfo = getLatestMigrationInfo();

            if (commitInfo) {
                // Impulsiona para o começo (como se fosse agora ou pegamos a data exata se tivéssemos)
                // Usando nova data apenas para visualização para always bump
                feed.unshift(commitInfo);
            }
            if (migrationInfo) {
                feed.push(migrationInfo);
            }

            // Ordenar por data decrescente e manter limite
            feed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            return feed.slice(0, limit);

        } catch (error) {
            logger.error('Failed to fetch ecosystem feed', error instanceof Error ? error : new Error(String(error)), { tenantId });
            return [];
        }
    }
};
