import { getDb } from '@/infra/db';
import { customers, customerContacts, organizations } from '@/drizzle/schema';
import { resolveCustomerByPhone } from '@/modules/customers/identity-resolver/identity-resolver.service';
import { hashPhone } from '@/lib/phone/normalize-phone';
import { encryptString } from '@/infra/pii/crypto';
import { randomUUID } from 'crypto';

export const customerResolutionService = {
    async resolveOrCreateCustomer(tenantId: string, phone: string, nameFallback: string = 'Novo Lead WhatsApp'): Promise<{ customerId: string, organizationId: string, isNew: boolean, contactId: string | null }> {
        const existing = await resolveCustomerByPhone(tenantId, phone);
        if (existing && existing.customerId && existing.organizationId) {
            return {
                customerId: existing.customerId,
                organizationId: existing.organizationId,
                isNew: false,
                contactId: existing.contactId
            };
        }

        const db = await getDb();
        const organizationId = randomUUID();
        const customerId = randomUUID();
        const contactId = randomUUID();
        const phoneHashBase = hashPhone(phone);
        const encryptedPhone = encryptString(phone);

        // 1. Create a minimal organization using phoneHash as a surrogate for cnpjHash since we don't have it yet.
        await db.insert(organizations).values({
            id: organizationId,
            tenantId,
            legalName: nameFallback,
            cnpjHash: phoneHashBase, // surrogate key to allow inserts
        });

        // 2. Create the customer record linked to the organization
        await db.insert(customers).values({
            id: customerId,
            tenantId,
            organizationId,
            segment: 'Lead Novo',
            status: 'ativo',
        });

        // 3. Create the contact point for this customer
        await db.insert(customerContacts).values({
            id: contactId,
            tenantId,
            customerId,
            organizationId,
            name: nameFallback,
            phoneHash: phoneHashBase,
            phoneEncrypted: encryptedPhone,
            isPrimary: true,
        });

        // We could emit the Lead Added event right here, but letting the caller do it might be better
        // since they have more context (MessageSid, etc).

        return {
            customerId,
            organizationId,
            contactId,
            isNew: true
        };
    }
};
