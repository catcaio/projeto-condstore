import { getDb } from '../../src/infra/db';
import { sql, eq, and, gte, or, like } from 'drizzle-orm';
import { orders, operationalEvents } from '../../src/drizzle/schema';
import { messageRepository } from '../../src/infra/repositories/message.repository';
import { simulationRepository } from '../../src/infra/repositories/simulation.repository';

async function validateCockpitMetrics(tenantId: string) {
  console.log(`Validating cockpit metrics for tenant: ${tenantId}`);

  const db = await getDb();

  // mensagensHoje
  const msgMetrics = await messageRepository.getMetricsToday(tenantId);
  console.log('mensagensHoje:', msgMetrics);

  // cotacoesHoje
  const cotacoesHoje = await simulationRepository.countToday(tenantId);
  console.log('cotacoesHoje:', cotacoesHoje);

  // pedidosHoje
  const pedidosRows = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(orders)
    .where(
      and(
        eq(orders.tenantId, tenantId),
        gte(orders.createdAt, sql`CURDATE()`)
      )
    );
  const pedidosHoje = pedidosRows[0]?.count ?? 0;
  console.log('pedidosHoje:', pedidosHoje);

  // erros24h
  const errosRows = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(operationalEvents)
    .where(
      and(
        eq(operationalEvents.tenantId, tenantId),
        gte(operationalEvents.createdAt, sql`NOW() - INTERVAL 24 HOUR`),
        or(
          like(operationalEvents.eventType, '%FAILED%'),
          like(operationalEvents.eventType, '%ERROR%')
        )
      )
    );
  const erros24h = errosRows[0]?.count ?? 0;
  console.log('erros24h:', erros24h);

  // Verificar isolamento: tentar consultar outro tenant
  const otherTenant = 'some-other-tenant';
  const otherMsg = await messageRepository.getMetricsToday(otherTenant);
  console.log(`mensagensHoje for other tenant (${otherTenant}):`, otherMsg);

  const otherCot = await simulationRepository.countToday(otherTenant);
  console.log(`cotacoesHoje for other tenant (${otherTenant}):`, otherCot);

  // Verificar filas: mensagens pendentes (conversas awaiting_human ou new)
  const pendingConversations = await db.execute(sql`
    SELECT COUNT(*) as count FROM conversations
    WHERE tenant_id = ${tenantId}
    AND status IN ('new', 'awaiting_human')
  `);
  console.log('Conversas pendentes (inbox):', pendingConversations);

  // Cotações pendentes
  const pendingQuotes = await db.execute(sql`
    SELECT COUNT(*) as count FROM simulations
    WHERE tenant_id = ${tenantId}
    AND status = 'pending'
  `);
  console.log('Cotações pendentes:', pendingQuotes);

  // Pedidos abertos
  const openOrders = await db.execute(sql`
    SELECT COUNT(*) as count FROM orders
    WHERE tenant_id = ${tenantId}
    AND status NOT IN ('delivered', 'cancelled')
  `);
  console.log('Pedidos abertos:', openOrders);
}

const tenantId = process.argv[2] || 'demo-mvp-tenant';
validateCockpitMetrics(tenantId).catch(console.error);
