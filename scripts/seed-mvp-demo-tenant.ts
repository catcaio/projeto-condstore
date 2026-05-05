import crypto from 'node:crypto';
import mysql from 'mysql2/promise';

type JsonLog = Record<string, unknown>;

const DEFAULT_DATABASE_URL = 'mysql://user:pass@127.0.0.1:3306/lojacond';
const DEFAULT_TENANT_ID = 'demo-mvp-tenant';
const DEFAULT_ADMIN_EMAIL = 'demo@condstore.io';
const baseDate = new Date('2026-03-20T14:30:00.000Z');

const ids = {
  tenant: DEFAULT_TENANT_ID,
  adminUser: '1f741780-9a62-4e31-aed7-f46a30f1bc00',
  operatorUser: '9a2d4a31-7f2c-4480-8d6e-84b2d95d2edb',
  organization: 'a5ac2cfc-bc0d-4d92-97ba-ed98a8205c06',
  customer: '8fdad2a8-790a-4770-957b-cf4025f28f6c',
  contact: '818beaf3-2f90-4ea6-80b8-75430b2bc247',
  conversation: '8dd50325-8f31-4478-bf08-f83655e7ad6f',
  quoteDraft: '7a2cdfd4-7860-4ef4-aaec-d499198152c9',
  quoteAccepted: 'b5b07f5f-8ce3-4ff8-a41d-b14953131b6b',
  orderDeliveredOne: '4dd5314e-bf0d-4ce4-b7bc-720e4ce3477b',
  orderDeliveredTwo: '66b77eb5-7742-47ff-b8ce-13fca44c3bfb',
  orderDeliveredThree: 'b72f5d34-f229-40a6-8f9d-a42ad5fdbeb5',
  orderOpen: 'd00dcfd8-b36f-466a-8f01-8c8e4ba2d05f',
  shipmentOne: '88d57f58-61df-418e-b1ec-6540f6f51ca8',
  shipmentTwo: '2bb56d98-b7f8-4f84-93e8-49f1ad3fe4d9',
  shipmentThree: 'f9d99bc4-93e1-4307-81e8-4d0996078c7f',
  shipmentOpen: 'b8396f59-1f22-45f6-a299-7f08cb6efb93',
};

function log(level: 'info' | 'warn' | 'error', event: string, context: JsonLog = {}): void {
  const payload = {
    level,
    event,
    ts: new Date().toISOString(),
    ...context,
  };
  const line = JSON.stringify(payload);

  if (level === 'error') {
    console.error(line);
    return;
  }

  if (level === 'warn') {
    console.warn(line);
    return;
  }

  console.log(line);
}

function hashSha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function hashPassword(password: string): string {
  const salt = 'condstore-demo-fixed-salt';
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function isoWithOffset(days: number): string {
  return new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
}

async function upsertTenant(connection: mysql.Connection, tenantId: string): Promise<void> {
  await connection.execute(
    `INSERT INTO tenants
      (id, name, twilio_number, timezone, plan, plan_status, plan_current_period_end, outbound_enabled, incident_mode)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      twilio_number = VALUES(twilio_number),
      timezone = VALUES(timezone),
      plan = VALUES(plan),
      plan_status = VALUES(plan_status),
      plan_current_period_end = VALUES(plan_current_period_end),
      outbound_enabled = VALUES(outbound_enabled),
      incident_mode = VALUES(incident_mode)`,
    [
      tenantId,
      'Tenant Demo MVP Condstore',
      'whatsapp:+5511998887766',
      'America/Sao_Paulo',
      'PRO',
      'active',
      isoWithOffset(45),
      1,
      0,
    ],
  );
}

async function upsertUsers(connection: mysql.Connection, tenantId: string, adminPassword: string): Promise<void> {
  const passwordHash = hashPassword(adminPassword);

  await connection.execute(
    `INSERT INTO users
      (id, email, name, password_hash, tenant_id, role, auth_provider, session_version)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      password_hash = VALUES(password_hash),
      tenant_id = VALUES(tenant_id),
      role = VALUES(role),
      auth_provider = VALUES(auth_provider),
      session_version = VALUES(session_version)`,
    [ids.adminUser, DEFAULT_ADMIN_EMAIL, 'Operador Demo', passwordHash, tenantId, 'admin', 'email', 1],
  );

  await connection.execute(
    `INSERT INTO users
      (id, email, name, password_hash, tenant_id, role, auth_provider, session_version)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      password_hash = VALUES(password_hash),
      tenant_id = VALUES(tenant_id),
      role = VALUES(role),
      auth_provider = VALUES(auth_provider),
      session_version = VALUES(session_version)`,
    [
      ids.operatorUser,
      'operacao.demo@condstore.io',
      'Analista Operacional',
      passwordHash,
      tenantId,
      'operator',
      'email',
      1,
    ],
  );
}

async function upsertCrmBase(connection: mysql.Connection, tenantId: string): Promise<void> {
  const cnpjHash = hashSha256('12.345.678/0001-99');
  const phoneHash = hashSha256('+5511998876655');
  const emailHash = hashSha256('carlos.andrade@construdis.com.br');

  await connection.execute(
    `INSERT INTO organizations
      (id, tenant_id, legal_name, trade_name, cnpj_hash, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      legal_name = VALUES(legal_name),
      trade_name = VALUES(trade_name),
      cnpj_hash = VALUES(cnpj_hash),
      status = VALUES(status)`,
    [
      ids.organization,
      tenantId,
      'Construdis Materiais LTDA',
      'Construdis',
      cnpjHash,
      'active',
      isoWithOffset(-35),
    ],
  );

  await connection.execute(
    `INSERT INTO customers
      (id, tenant_id, organization_id, segment, status, owner_id, activity_bucket, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      segment = VALUES(segment),
      status = VALUES(status),
      owner_id = VALUES(owner_id),
      activity_bucket = VALUES(activity_bucket)`,
    [
      ids.customer,
      tenantId,
      ids.organization,
      'materiais_construcao',
      'ativo',
      ids.operatorUser,
      'RECORRENTE',
      isoWithOffset(-35),
    ],
  );

  await connection.execute(
    `INSERT INTO customer_contacts
      (id, tenant_id, customer_id, organization_id, name, email_hash, email_encrypted, phone_hash, phone_encrypted, role, is_primary, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      email_hash = VALUES(email_hash),
      email_encrypted = VALUES(email_encrypted),
      phone_hash = VALUES(phone_hash),
      phone_encrypted = VALUES(phone_encrypted),
      role = VALUES(role),
      is_primary = VALUES(is_primary)`,
    [
      ids.contact,
      tenantId,
      ids.customer,
      ids.organization,
      'Carlos Andrade',
      emailHash,
      'enc:carlos.andrade@construdis.com.br',
      phoneHash,
      'enc:+5511998876655',
      'Comprador',
      1,
      isoWithOffset(-35),
    ],
  );

  await connection.execute(
    `INSERT INTO conversations
      (id, tenant_id, customer_id, organization_id, phone_hash, phone_encrypted, channel, status, stage, version, assigned_to, last_message_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      customer_id = VALUES(customer_id),
      organization_id = VALUES(organization_id),
      status = VALUES(status),
      stage = VALUES(stage),
      assigned_to = VALUES(assigned_to),
      last_message_at = VALUES(last_message_at)`,
    [
      ids.conversation,
      tenantId,
      ids.customer,
      ids.organization,
      phoneHash,
      'enc:+5511998876655',
      'WHATSAPP',
      'operator_active',
      'QUOTED',
      0,
      ids.operatorUser,
      isoWithOffset(-1),
      isoWithOffset(-8),
    ],
  );

  await connection.execute(
    `INSERT INTO conversation_messages
      (id, tenant_id, conversation_id, direction, source, message, delivery_status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      message = VALUES(message),
      delivery_status = VALUES(delivery_status),
      created_at = VALUES(created_at)`,
    [
      '42f0a5a7-621f-4905-a9fd-28ee53c74ecc',
      tenantId,
      ids.conversation,
      'inbound',
      'WHATSAPP',
      'Boa tarde! Preciso de 12 sacos de cimento CP-II para entregar em Limeira, no CEP 13480-000. Qual o frete?',
      'delivered',
      isoWithOffset(-1),
    ],
  );

  await connection.execute(
    `INSERT INTO conversation_messages
      (id, tenant_id, conversation_id, direction, source, message, delivery_status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      message = VALUES(message),
      delivery_status = VALUES(delivery_status),
      created_at = VALUES(created_at)`,
    [
      '74ca6a6d-c2b5-44cc-bf1e-2f89e6f9f80d',
      tenantId,
      ids.conversation,
      'outbound',
      'OPERATOR',
      'Boa tarde, Carlos! Temos 3 opções de frete. Você prefere melhor preço ou melhor prazo?',
      'sent',
      isoWithOffset(-1),
    ],
  );
}

async function upsertCommercialFlow(connection: mysql.Connection, tenantId: string): Promise<void> {
  const quoteItems = JSON.stringify([
    {
      sku: 'CIM-CP2-50',
      name: 'Cimento CP-II 50kg',
      quantity: 12,
      unitPrice: 42,
      subtotal: 504,
      dimensionsCm: { length: 60, width: 40, height: 15 },
      unitWeightKg: 50,
    },
  ]);

  await connection.execute(
    `INSERT INTO simulations
      (id, tenant_id, customer_id, organization_id, conversation_id, source, cep, weight, quantity, product_cost, selling_price, best_carrier, best_service, best_price, best_margin, strategy, idempotency_key, event, status, items, subtotal, discount_amount, freight_amount, total_amount, expires_at, sent_at, revision_count, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      best_carrier = VALUES(best_carrier),
      best_service = VALUES(best_service),
      best_price = VALUES(best_price),
      best_margin = VALUES(best_margin),
      status = VALUES(status),
      items = VALUES(items),
      subtotal = VALUES(subtotal),
      discount_amount = VALUES(discount_amount),
      freight_amount = VALUES(freight_amount),
      total_amount = VALUES(total_amount),
      expires_at = VALUES(expires_at),
      sent_at = VALUES(sent_at),
      revision_count = VALUES(revision_count)`,
    [
      ids.quoteDraft,
      tenantId,
      ids.customer,
      ids.organization,
      ids.conversation,
      'ATENDIMENTO',
      '13480000',
      '600.00',
      12,
      '420.00',
      '504.00',
      'Movvi',
      'Rodoviário D+3',
      '148.00',
      '84.00',
      'MARGIN_BALANCED',
      `seed:${tenantId}:quote-draft`,
      'FREIGHT_QUOTED',
      'SENT',
      quoteItems,
      '504.00',
      '0.00',
      '148.00',
      '652.00',
      isoWithOffset(5),
      isoWithOffset(-1),
      1,
      isoWithOffset(-2),
    ],
  );

  await connection.execute(
    `INSERT INTO simulations
      (id, tenant_id, customer_id, organization_id, conversation_id, source, cep, weight, quantity, product_cost, selling_price, best_carrier, best_service, best_price, best_margin, strategy, idempotency_key, event, status, items, subtotal, discount_amount, freight_amount, total_amount, sent_at, converted_at, revision_count, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      best_carrier = VALUES(best_carrier),
      best_service = VALUES(best_service),
      best_price = VALUES(best_price),
      best_margin = VALUES(best_margin),
      status = VALUES(status),
      items = VALUES(items),
      subtotal = VALUES(subtotal),
      discount_amount = VALUES(discount_amount),
      freight_amount = VALUES(freight_amount),
      total_amount = VALUES(total_amount),
      sent_at = VALUES(sent_at),
      converted_at = VALUES(converted_at),
      revision_count = VALUES(revision_count)`,
    [
      ids.quoteAccepted,
      tenantId,
      ids.customer,
      ids.organization,
      ids.conversation,
      'ATENDIMENTO',
      '13480000',
      '600.00',
      12,
      '420.00',
      '504.00',
      'Melhor Envio',
      'PAC D+4',
      '132.00',
      '84.00',
      'BEST_PRICE',
      `seed:${tenantId}:quote-accepted`,
      'FREIGHT_QUOTED',
      'CONVERTED',
      quoteItems,
      '504.00',
      '0.00',
      '132.00',
      '636.00',
      isoWithOffset(-20),
      isoWithOffset(-19),
      0,
      isoWithOffset(-20),
    ],
  );

  const orders = [
    {
      id: ids.orderDeliveredOne,
      quoteId: null,
      status: 'DELIVERED',
      carrier: 'Movvi',
      service: 'Rodoviário D+3',
      total: '280.00',
      price: '280.00',
      deadline: 3,
      createdAt: isoWithOffset(-44),
      logisticsStatus: 'DELIVERED',
      itemName: '10x Cimento CP-II 50kg',
      itemQty: 10,
      unitPrice: '28.00',
      subtotal: '280.00',
      shipmentId: ids.shipmentOne,
      tracking: 'MOVVI-20260214-001',
      shipmentStatus: 'DELIVERED',
      estimatedDelivery: 3,
      timelineEventId: 'a2f9f4de-11ea-4c5c-9c0e-4a4decd722ef',
      timelineStatus: 'DELIVERED',
      timelineMessage: 'Pedido entregue com sucesso via Movvi.',
      metadata: { carrier: 'Movvi', total: 280, expectedDays: 3 },
    },
    {
      id: ids.orderDeliveredTwo,
      quoteId: null,
      status: 'DELIVERED',
      carrier: 'Braspress',
      service: 'Expresso D+2',
      total: '145.00',
      price: '145.00',
      deadline: 2,
      createdAt: isoWithOffset(-30),
      logisticsStatus: 'DELIVERED',
      itemName: '5x Argamassa AC-II 20kg',
      itemQty: 5,
      unitPrice: '29.00',
      subtotal: '145.00',
      shipmentId: ids.shipmentTwo,
      tracking: 'BRASP-20260228-014',
      shipmentStatus: 'DELIVERED',
      estimatedDelivery: 2,
      timelineEventId: 'a8eef8a7-c269-4a64-aa65-6d5deec5c42f',
      timelineStatus: 'DELIVERED',
      timelineMessage: 'Entrega concluída pela Braspress sem intercorrências.',
      metadata: { carrier: 'Braspress', total: 145, expectedDays: 2 },
    },
    {
      id: ids.orderDeliveredThree,
      quoteId: null,
      status: 'DELIVERED',
      carrier: 'Melhor Envio',
      service: 'PAC D+4',
      total: '62.00',
      price: '62.00',
      deadline: 4,
      createdAt: isoWithOffset(-20),
      logisticsStatus: 'DELIVERED',
      itemName: '8x Rejunte Cinza 1kg',
      itemQty: 8,
      unitPrice: '7.75',
      subtotal: '62.00',
      shipmentId: ids.shipmentThree,
      tracking: 'ME-20260310-991',
      shipmentStatus: 'DELIVERED',
      estimatedDelivery: 4,
      timelineEventId: '4f95ca8b-5dca-4869-aa3c-e1110a220455',
      timelineStatus: 'DELIVERED',
      timelineMessage: 'Cliente confirmou recebimento em Limeira/SP.',
      metadata: { carrier: 'Melhor Envio', total: 62, expectedDays: 4 },
    },
    {
      id: ids.orderOpen,
      quoteId: ids.quoteAccepted,
      status: 'SHIPPED',
      carrier: 'Melhor Envio',
      service: 'PAC D+4',
      total: '636.00',
      price: '636.00',
      deadline: 4,
      createdAt: isoWithOffset(-1),
      logisticsStatus: 'IN_TRANSIT',
      itemName: '12x Cimento CP-II 50kg',
      itemQty: 12,
      unitPrice: '42.00',
      subtotal: '504.00',
      shipmentId: ids.shipmentOpen,
      tracking: 'ME-20260329-777',
      shipmentStatus: 'IN_TRANSIT',
      estimatedDelivery: 4,
      timelineEventId: '1e3f5de6-1d30-440f-8ab4-3cb5d7e0d157',
      timelineStatus: 'SHIPPED',
      timelineMessage: 'Pedido demo em trânsito para Limeira/SP.',
      metadata: { carrier: 'Melhor Envio', total: 636, expectedDays: 4 },
    },
  ] as const;

  for (const order of orders) {
    await connection.execute(
      `INSERT INTO orders
        (id, tenant_id, customer_id, organization_id, conversation_id, quote_id, status, priority, channel, carrier, service, total_amount, price, delivery_deadline, created_by, owner_id, logistics_status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        priority = VALUES(priority),
        channel = VALUES(channel),
        carrier = VALUES(carrier),
        service = VALUES(service),
        total_amount = VALUES(total_amount),
        price = VALUES(price),
        delivery_deadline = VALUES(delivery_deadline),
        created_by = VALUES(created_by),
        owner_id = VALUES(owner_id),
        logistics_status = VALUES(logistics_status)`,
      [
        order.id,
        tenantId,
        ids.customer,
        ids.organization,
        ids.conversation,
        order.quoteId,
        order.status,
        'alta',
        'WHATSAPP',
        order.carrier,
        order.service,
        order.total,
        order.price,
        order.deadline,
        ids.operatorUser,
        ids.operatorUser,
        order.logisticsStatus,
        order.createdAt,
      ],
    );

    await connection.execute(
      `INSERT INTO order_items
        (id, tenant_id, order_id, sku, name, quantity, unit_price, subtotal, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        quantity = VALUES(quantity),
        unit_price = VALUES(unit_price),
        subtotal = VALUES(subtotal),
        created_at = VALUES(created_at)`,
      [
        `it-${order.id.slice(0, 33)}`,
        tenantId,
        order.id,
        `SKU-${order.id.slice(0, 8).toUpperCase()}`,
        order.itemName,
        order.itemQty,
        order.unitPrice,
        order.subtotal,
        order.createdAt,
      ],
    );

    await connection.execute(
      `INSERT INTO shipments
        (id, tenant_id, order_id, carrier, service, tracking_code, tracking_url, status, estimated_delivery, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        carrier = VALUES(carrier),
        service = VALUES(service),
        tracking_code = VALUES(tracking_code),
        tracking_url = VALUES(tracking_url),
        status = VALUES(status),
        estimated_delivery = VALUES(estimated_delivery)`,
      [
        order.shipmentId,
        tenantId,
        order.id,
        order.carrier,
        order.service,
        order.tracking,
        `https://tracking.condstore.local/${order.tracking}`,
        order.shipmentStatus,
        order.estimatedDelivery,
        order.createdAt,
      ],
    );

    await connection.execute(
      `INSERT INTO customer_timeline_events
        (id, tenant_id, organization_id, entity_type, entity_id, status, message_public, metadata_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        message_public = VALUES(message_public),
        metadata_json = VALUES(metadata_json),
        created_at = VALUES(created_at)`,
      [
        order.timelineEventId,
        tenantId,
        ids.organization,
        'ORDER',
        order.id,
        order.timelineStatus,
        order.timelineMessage,
        JSON.stringify(order.metadata),
        order.createdAt,
      ],
    );
  }
}

async function validateDataset(connection: mysql.Connection, tenantId: string): Promise<void> {
  const [ordersCountRows] = await connection.execute<mysql.RowDataPacket[]>(
    'SELECT COUNT(*) AS total FROM orders WHERE tenant_id = ?',
    [tenantId],
  );
  const [customersCountRows] = await connection.execute<mysql.RowDataPacket[]>(
    'SELECT COUNT(*) AS total FROM customers WHERE tenant_id = ?',
    [tenantId],
  );
  const [shipmentsCountRows] = await connection.execute<mysql.RowDataPacket[]>(
    'SELECT COUNT(*) AS total FROM shipments WHERE tenant_id = ?',
    [tenantId],
  );

  const ordersCount = Number(ordersCountRows[0]?.total ?? 0);
  const customersCount = Number(customersCountRows[0]?.total ?? 0);
  const shipmentsCount = Number(shipmentsCountRows[0]?.total ?? 0);

  log('info', 'seed.validation.summary', {
    tenantId,
    customersCount,
    ordersCount,
    shipmentsCount,
    expected: {
      customersCount: 1,
      ordersCount: 4,
      shipmentsCount: 4,
    },
  });

  if (customersCount < 1 || ordersCount < 4 || shipmentsCount < 4) {
    throw new Error(`Dataset incompleto para tenant ${tenantId}`);
  }
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
  const tenantId = process.env.DEMO_TENANT_ID || DEFAULT_TENANT_ID;
  
  let adminPassword = process.env.DEMO_ADMIN_PASSWORD;
  let isGenerated = false;

  if (!adminPassword) {
    const isLocalOrDev = !process.env.VERCEL_ENV || process.env.VERCEL_ENV === 'development';
    
    if (isLocalOrDev) {
      adminPassword = crypto.randomBytes(12).toString('base64').replace(/[/+=]/g, '');
      isGenerated = true;
    } else {
      throw new Error('DEMO_ADMIN_PASSWORD environment variable is required in production/preview environments.');
    }
  }

  const url = new URL(databaseUrl);
  // Removendo params que o mysql2 puro não entende via URI (como ssl JSON)
  url.search = '';
  const cleanUrl = url.toString();

  const connection = await mysql.createConnection({
    uri: cleanUrl,
    ssl: { rejectUnauthorized: true }
  });

  try {
    log('info', 'seed.start', { tenantId });
    await connection.beginTransaction();

    await upsertTenant(connection, tenantId);
    await upsertUsers(connection, tenantId, adminPassword);
    await upsertCrmBase(connection, tenantId);
    await upsertCommercialFlow(connection, tenantId);

    await connection.commit();
    log('info', 'seed.commit.ok', { tenantId });

    await validateDataset(connection, tenantId);

    log('info', 'seed.completed', {
      tenantId,
      adminEmail: DEFAULT_ADMIN_EMAIL,
      adminPassword: isGenerated ? `(GENERATED: ${adminPassword})` : '(FROM_ENV)',
      notes: 'Execução idempotente; pode rodar antes de cada demo/piloto.',
    });
  } catch (error) {
    await connection.rollback();
    log('error', 'seed.failed', {
      tenantId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error('Seed execution failed:', err);
  process.exit(1);
});
