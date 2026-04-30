import { selectCarrierStrategy, type RoutingRequest } from '../src/modules/freight/carrier-router';
import { melhorEnvioConfig } from '../src/config/melhorenvio.config';
import { getDb } from '../src/infra/db';
import * as schema from '../src/drizzle/schema';
import { eq } from 'drizzle-orm';

async function validate() {
  console.log('=> Starting Freight Readiness Validation...');

  const db = await getDb();
  const targetTenantId = process.env.TARGET_TENANT_ID || 'demo-mvp-tenant';

  console.log(`=> Validating freight for tenant: ${targetTenantId}`);

  try {
    // 1. Validar Tenant e Configurações de Frete no DB
    const [tenant] = await db.select()
      .from(schema.tenants)
      .where(eq(schema.tenants.id, targetTenantId))
      .limit(1);

    if (!tenant) {
      console.error(`❌ Tenant ${targetTenantId} not found.`);
      process.exit(1);
    }
    console.log('✅ Tenant exists.');

    // 2. Validar Variáveis de Ambiente (Nomes)
    const criticalEnvs = [
      'MELHOR_ENVIO_API_URL',
      'MELHOR_ENVIO_TOKEN',
      'DATABASE_URL'
    ];

    for (const env of criticalEnvs) {
      if (process.env[env]) {
        console.log(`✅ Env ${env} is set.`);
      } else {
        console.warn(`⚠️ Env ${env} is NOT set. Fallback to defaults might occur.`);
      }
    }

    console.log(`ℹ️ Melhor Envio API URL: ${melhorEnvioConfig.apiUrl}`);

    // 3. Validar Roteamento - Cenário 1: Pacote Leve (Melhor Envio)
    const lightRequest: RoutingRequest = {
      tenantId: targetTenantId,
      originCep: '01001000',
      destinationCep: '88010000',
      totalWeight: 2,
      cubedWeight: 1,
      chargedWeight: 2,
      volumes: 1,
      longestDimensionCm: 30
    };

    const lightResult = selectCarrierStrategy(lightRequest);
    if (lightResult.strategy === 'melhor_envio') {
      console.log('✅ Carrier Router: Rule 1 (Light package -> Melhor Envio) OK.');
    } else {
      console.error(`❌ Carrier Router: Rule 1 failed. Expected melhor_envio, got ${lightResult.strategy}`);
      process.exit(1);
    }

    // 4. Validar Roteamento - Cenário 2: Pacote Pesado Sul/Sudeste (Table Carriers)
    const heavyRequestSul: RoutingRequest = {
      tenantId: targetTenantId,
      originCep: '01001000',
      destinationCep: '88010000', // SC
      totalWeight: 50,
      cubedWeight: 40,
      chargedWeight: 50,
      volumes: 2,
      longestDimensionCm: 120
    };

    const heavyResultSul = selectCarrierStrategy(heavyRequestSul);
    if (heavyResultSul.strategy === 'table_carriers') {
      console.log('✅ Carrier Router: Rule 2 (Heavy package Sul/Sudeste -> Table Carriers) OK.');
    } else {
      console.error(`❌ Carrier Router: Rule 2 failed. Expected table_carriers, got ${heavyResultSul.strategy}`);
      process.exit(1);
    }

    // 5. Validar Roteamento - Cenário 3: Pacote Pesado Norte/Nordeste (Braspress)
    const heavyRequestNorth: RoutingRequest = {
      tenantId: targetTenantId,
      originCep: '01001000',
      destinationCep: '60010000', // CE
      totalWeight: 50,
      cubedWeight: 40,
      chargedWeight: 50,
      volumes: 2,
      longestDimensionCm: 120
    };

    const heavyResultNorth = selectCarrierStrategy(heavyRequestNorth);
    if (heavyResultNorth.strategy === 'braspress_api') {
      console.log('✅ Carrier Router: Rule 3 (Heavy package Other -> Braspress) OK.');
    } else {
      console.error(`❌ Carrier Router: Rule 3 failed. Expected braspress_api, got ${heavyResultNorth.strategy}`);
      process.exit(1);
    }

    // 6. Verificar se existem tabelas de frete carregadas no DB (carrier_rate_rows)
    const ratesCount = await db.select({ count: schema.carrierRateRows.id })
      .from(schema.carrierRateRows)
      .limit(1);
    
    if (ratesCount.length > 0) {
      console.log('✅ Local freight tables (carrier_rate_rows) found.');
    } else {
      console.warn('⚠️ No local freight tables found in carrier_rate_rows. Table-driven fallback will return zero options.');
    }

    console.log('\n🚀 FREIGHT READINESS: OK');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Freight readiness check failed:', error.message);
    process.exit(1);
  }
}

validate();
