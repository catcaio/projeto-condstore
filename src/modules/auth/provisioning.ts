import crypto from 'node:crypto';
import { getDb } from '@/infra/db';
import { tenants, tenantBudgets, users, tenantSignupPolicies } from '@/drizzle/schema';
import { structuredLogger } from '@/infra/log/logger';
import { sha256Hex } from '@/infra/attribution/hash';

interface ProvisioningResult {
    tenantId: string;
    role: 'admin' | 'operator' | 'manager' | 'viewer';
}

/**
 * Provisões um novo tenant e retorna os dados necessários para criar o usuário.
 * Esta lógica é centralizada para garantir consistência entre signup manual e Google.
 */
export async function provisionNewTenant(name: string, email: string): Promise<ProvisioningResult> {
    const db = await getDb();
    const tenantId = crypto.randomUUID();
    const role = 'admin'; // Novo workspace -> o criador é admin

    await db.insert(tenants).values({
        id: tenantId,
        name: `Loja de ${name}`,
        twilioNumber: `PENDING-${tenantId.substring(0, 8)}`, // Placeholder
    });

    await db.insert(tenantBudgets).values({
        tenantId: tenantId,
        monthlyTokenLimit: 100000,
    });

    structuredLogger.info('tenant_provisioned', {
        eventType: 'provisioning',
        tenantId,
        userEmailHash: sha256Hex(email),
    });

    return { tenantId, role };
}

/**
 * Tenta resolver o tenant por domínio ou políticas existentes.
 * Se não encontrar, retorna null.
 */
export async function resolveTenantByPolicy(email: string): Promise<string | null> {
    const db = await getDb();
    const normalizedEmail = email.trim().toLowerCase();
    const emailDomain = normalizedEmail.split('@')[1];

    if (!emailDomain) return null;

    const policies = await db.select().from(tenantSignupPolicies);
    for (const policy of policies) {
        const domains = (policy.allowedDomains as string[]) || [];
        if (domains.includes(emailDomain)) {
            return policy.tenantId;
        }
        const emails = (policy.allowedEmails as string[]) || [];
        if (emails.includes(normalizedEmail)) {
            return policy.tenantId;
        }
    }

    return null;
}
