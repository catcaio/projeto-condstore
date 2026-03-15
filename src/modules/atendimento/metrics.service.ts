import { sql } from 'drizzle-orm';
import { getDb } from '@/infra/db';
import { logger } from '@/infra/logger';

export interface MetricsFilter {
    tenantId: string;
    fromDate?: Date;
    toDate?: Date;
}

export interface OperatorMetric {
    operatorId: string;
    conversationCount: number;
    quoteCount: number;
    orderCount: number;
    avgFirstResponseTimeSec: number;
}

export interface SummaryMetrics {
    // Operational
    totalConversations: number;
    activeBacklog: number;
    conversationsByStage: Record<string, number>;
    avgFirstHumanResponseSec: number;
    avgTimeToFirstQuoteSec: number;
    avgServiceTimeSec: number; // For resolved conversations
    operatorMetrics: OperatorMetric[];

    // Commercial
    totalNewLeads: number;
    totalQuotesCreated: number;
    totalQuotesSent: number;
    totalOrdersCreated: number;
    totalOrdersConfirmed: number;
    
    // Funnel
    conversionLeadToAttendance: number; // %
    conversionAttendanceToQuote: number; // %
    conversionQuoteToWon: number; // %

    // Revenue
    totalRevenueConfirmed: number;
    averageTicketConfirmed: number;
}

export const metricsService = {
    async getMetrics(filter: MetricsFilter): Promise<SummaryMetrics> {
        const db = await getDb();
        const { tenantId, fromDate, toDate } = filter;

        const dateParts = [];
        if (fromDate) dateParts.push(sql`created_at >= ${fromDate}`);
        if (toDate) dateParts.push(sql`created_at <= ${toDate}`);
        const dateSqlStr = dateParts.length > 0 ? sql` AND ${sql.join(dateParts, sql` AND `)}` : sql``;
        

        const [
            opStatsResult,
            stageStatsResult,
            commercialStatsResult,
            funnelStatsResult,
            revenueStatsResult,
            timingStatsResult,
            operatorStatsResult
        ] = await Promise.all([
            // 1. Operational Stats (Counts)
            db.execute(sql`
                SELECT 
                    COUNT(*) as totalConversations,
                    SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) as activeBacklog
                FROM conversations
                WHERE tenant_id = ${tenantId} ${dateSqlStr}
            `),

            // 2. Open Conversations By Stage
            db.execute(sql`
                SELECT stage, COUNT(*) as cnt
                FROM conversations
                WHERE tenant_id = ${tenantId} AND status != 'RESOLVED' ${dateSqlStr}
                GROUP BY stage
            `),

            // 3. Commercial Aggregates
            Promise.all([
                db.execute(sql`
                    SELECT COUNT(*) as cnt FROM conversations WHERE tenant_id = ${tenantId} AND stage = 'NEW_LEAD' ${dateSqlStr}
                `),
                db.execute(sql`
                    SELECT 
                        COUNT(*) as totalQuotes,
                        SUM(CASE WHEN status = 'SENT' THEN 1 ELSE 0 END) as sentQuotes
                    FROM simulations
                    WHERE tenant_id = ${tenantId} AND source = 'ATENDIMENTO' ${dateSqlStr}
                `),
                db.execute(sql`
                    SELECT 
                        COUNT(*) as totalOrders,
                        SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END) as confirmedOrders
                    FROM orders
                    WHERE tenant_id = ${tenantId} ${dateSqlStr}
                `)
            ]),

            // 4. Funnel Conversions
            db.execute(sql`
                SELECT 
                    SUM(CASE WHEN stage IN ('NEW_LEAD', 'IN_ATTENDANCE', 'QUOTED', 'WON', 'LOST') THEN 1 ELSE 0 END) as totalLeadScope,
                    SUM(CASE WHEN stage IN ('IN_ATTENDANCE', 'QUOTED', 'WON', 'LOST') THEN 1 ELSE 0 END) as advancedToAttendance,
                    SUM(CASE WHEN stage IN ('QUOTED', 'WON', 'LOST') THEN 1 ELSE 0 END) as advancedToQuote,
                    SUM(CASE WHEN stage IN ('WON') THEN 1 ELSE 0 END) as advancedToWon
                FROM conversations
                WHERE tenant_id = ${tenantId} ${dateSqlStr}
            `),

            // 5. Revenue
            db.execute(sql`
                SELECT SUM(price) as totalRevenue, AVG(price) as avgTicket
                FROM orders
                WHERE tenant_id = ${tenantId} AND status = 'CONFIRMED' ${dateSqlStr}
            `),

            // 6. Timings
            db.execute(sql`
                WITH FirstInbound AS (
                    SELECT conversation_id, MIN(created_at) as first_in
                    FROM conversation_messages
                    WHERE tenant_id = ${tenantId} AND direction = 'INBOUND'
                    GROUP BY conversation_id
                ),
                FirstOutboundHuman AS (
                    SELECT conversation_id, MIN(created_at) as first_out_human
                    FROM conversation_messages
                    WHERE tenant_id = ${tenantId} AND direction = 'OUTBOUND' AND source = 'OPERATOR'
                    GROUP BY conversation_id
                ),
                FirstQuote AS (
                    SELECT conversation_id, MIN(created_at) as first_quote
                    FROM simulations
                    WHERE tenant_id = ${tenantId} AND source = 'ATENDIMENTO'
                    GROUP BY conversation_id
                ),
                ResolvedConv AS (
                    SELECT id as conversation_id, created_at, updated_at
                    FROM conversations
                    WHERE tenant_id = ${tenantId} AND status = 'RESOLVED'
                )
                SELECT 
                    AVG(TIMESTAMPDIFF(SECOND, i.first_in, h.first_out_human)) as avgFirstResponseSec,
                    AVG(TIMESTAMPDIFF(SECOND, i.first_in, q.first_quote)) as avgFirstQuoteSec,
                    AVG(TIMESTAMPDIFF(SECOND, r.created_at, r.updated_at)) as avgServiceTimeSec
                FROM FirstInbound i
                LEFT JOIN FirstOutboundHuman h ON i.conversation_id = h.conversation_id AND h.first_out_human > i.first_in
                LEFT JOIN FirstQuote q ON i.conversation_id = q.conversation_id AND q.first_quote > i.first_in
                LEFT JOIN ResolvedConv r ON i.conversation_id = r.conversation_id
            `),

            // 7. Operator Metrics
            db.execute(sql`
                WITH FirstInbound AS (
                    SELECT conversation_id, MIN(created_at) as first_in
                    FROM conversation_messages
                    WHERE tenant_id = ${tenantId} AND direction = 'INBOUND'
                    GROUP BY conversation_id
                ),
                FirstOutboundByOperator AS (
                    SELECT conversation_id, JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.operatorId')) as operator_id_from_meta, MIN(created_at) as first_out
                    FROM conversation_messages
                    WHERE tenant_id = ${tenantId} AND direction = 'OUTBOUND' AND source = 'OPERATOR'
                    GROUP BY conversation_id, JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.operatorId'))
                )
                SELECT 
                    a.assigned_to as operatorId,
                    COUNT(DISTINCT c.id) as conversationCount,
                    COUNT(DISTINCT s.id) as quoteCount,
                    COUNT(DISTINCT o.id) as orderCount,
                    AVG(TIMESTAMPDIFF(SECOND, fi.first_in, fo.first_out)) as avgFirstResponseSec
                FROM conversation_assignments a
                JOIN conversations c ON c.id = a.conversation_id
                LEFT JOIN simulations s ON s.conversation_id = c.id
                LEFT JOIN orders o ON o.conversation_id = c.id
                LEFT JOIN FirstInbound fi ON fi.conversation_id = c.id
                LEFT JOIN FirstOutboundByOperator fo ON fo.conversation_id = c.id AND (fo.operator_id_from_meta = a.assigned_to OR fo.operator_id_from_meta IS NULL) AND fo.first_out > fi.first_in
                WHERE a.tenant_id = ${tenantId} 
                -- We use the conversation's created_at for filtering these too
                ${dateParts.length > 0 ? sql` AND ${sql.join(dateParts.map(p => {
                    const pStr = p.queryChunks[0] as string;
                    return sql.raw(pStr.replace('created_at', 'c.created_at'))
                }), sql` AND `)}` : sql``}
                GROUP BY a.assigned_to
            `)
        ]).catch(err => {
            logger.error('Failed executing metrics batch SQL', err);
            throw err;
        });

        // Parse Results from the MySQL driver layer Drizzle passes through (returns [rows, fields...])
        const opRow = (opStatsResult as any)[0]?.[0] || {};
        const revenueRow = (revenueStatsResult as any)[0]?.[0] || {};
        const funnelRow = (funnelStatsResult as any)[0]?.[0] || {};
        const timingRow = (timingStatsResult as any)[0]?.[0] || {};
        const commericalRows = commercialStatsResult as any;
        const opList = (operatorStatsResult as any)[0] || [];

        const conversationsByStage: Record<string, number> = {};
        ((stageStatsResult as any)[0] || []).forEach((r: any) => {
            if (r.stage) conversationsByStage[r.stage] = Number(r.cnt);
        });

        const num = (v: any) => Number(v) || 0;

        const totalLeadScope = num(funnelRow.totalLeadScope);
        const advancedToAttendance = num(funnelRow.advancedToAttendance);
        const advancedToQuote = num(funnelRow.advancedToQuote);

        return {
            totalConversations: num(opRow.totalConversations),
            activeBacklog: num(opRow.activeBacklog),
            conversationsByStage,
            avgFirstHumanResponseSec: num(timingRow.avgFirstResponseSec),
            avgTimeToFirstQuoteSec: num(timingRow.avgFirstQuoteSec),
            avgServiceTimeSec: num(timingRow.avgServiceTimeSec),
            
            totalNewLeads: num(commericalRows[0][0]?.[0]?.cnt),
            totalQuotesCreated: num(commericalRows[1][0]?.[0]?.totalQuotes),
            totalQuotesSent: num(commericalRows[1][0]?.[0]?.sentQuotes),
            totalOrdersCreated: num(commericalRows[2][0]?.[0]?.totalOrders),
            totalOrdersConfirmed: num(commericalRows[2][0]?.[0]?.confirmedOrders),

            conversionLeadToAttendance: totalLeadScope ? (advancedToAttendance / totalLeadScope) * 100 : 0,
            conversionAttendanceToQuote: advancedToAttendance ? (advancedToQuote / advancedToAttendance) * 100 : 0,
            conversionQuoteToWon: advancedToQuote ? (num(funnelRow.advancedToWon) / advancedToQuote) * 100 : 0,

            totalRevenueConfirmed: num(revenueRow.totalRevenue),
            averageTicketConfirmed: num(revenueRow.avgTicket),

            operatorMetrics: opList.map((r: any) => ({
                operatorId: r.operatorId,
                conversationCount: num(r.conversationCount),
                quoteCount: num(r.quoteCount),
                orderCount: num(r.orderCount),
                avgFirstResponseTimeSec: num(r.avgFirstResponseSec),
            }))
        };
    }
};
