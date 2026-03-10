'use server';

import { getDb } from '@/infra/db';
import { carrierPolicies, carrierZones, carrierRateRows } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { requireTenantSession } from '@/infra/auth/session-helpers';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const policySchema = z.object({
    isActive: z.boolean(),
    originCity: z.string().min(1),
    originState: z.string().length(2),
    cubageFactor: z.string(),
    deliveryTimeDaysBase: z.number().int().min(0),
});

export async function updateCarrierPolicy(carrierName: string, data: z.infer<typeof policySchema>) {
    const session = await requireTenantSession();
    const db = await getDb();

    const validated = policySchema.parse(data);

    await db.update(carrierPolicies)
        .set({
            ...validated,
            updatedAt: new Date()
        })
        .where(and(
            eq(carrierPolicies.tenantId, session.tenantId),
            eq(carrierPolicies.carrierName, carrierName)
        ));

    revalidatePath('/logistica/tabelas-frete');
    revalidatePath(`/logistica/tabelas-frete/${carrierName.toLowerCase()}`);
    return { success: true };
}

const zoneSchema = z.object({
    id: z.string(),
    isActive: z.boolean(),
    state: z.string().length(2),
    cepRangeStart: z.string().nullable(),
    cepRangeEnd: z.string().nullable(),
    notes: z.string().nullable()
});

export async function updateCarrierZone(carrierName: string, data: z.infer<typeof zoneSchema>) {
    const session = await requireTenantSession();
    const db = await getDb();

    const validated = zoneSchema.parse(data);

    await db.update(carrierZones)
        .set({
            isActive: validated.isActive,
            state: validated.state,
            cepRangeStart: validated.cepRangeStart || null,
            cepRangeEnd: validated.cepRangeEnd || null,
            notes: validated.notes
        })
        .where(and(
            eq(carrierZones.id, validated.id),
            eq(carrierZones.tenantId, session.tenantId),
            eq(carrierZones.carrierName, carrierName)
        ));

    revalidatePath(`/logistica/tabelas-frete/${carrierName.toLowerCase()}`);
    return { success: true };
}

const rateSchema = z.object({
    id: z.string(),
    isActive: z.boolean(),
    weightBandMax: z.string(),
    basePrice: z.string(),
    deliveryTimeDays: z.number().nullable(),
    excessKgPrice: z.string(),
    advPercent: z.string()
});

export async function updateCarrierRate(carrierName: string, data: z.infer<typeof rateSchema>) {
    const session = await requireTenantSession();
    const db = await getDb();

    const validated = rateSchema.parse(data);

    await db.update(carrierRateRows)
        .set({
            isActive: validated.isActive,
            weightBandMax: validated.weightBandMax,
            basePrice: validated.basePrice,
            deliveryTimeDays: validated.deliveryTimeDays,
            excessKgPrice: validated.excessKgPrice,
            advPercent: validated.advPercent,
            updatedAt: new Date()
        })
        .where(and(
            eq(carrierRateRows.id, validated.id),
            eq(carrierRateRows.tenantId, session.tenantId),
            eq(carrierRateRows.carrierName, carrierName)
        ));

    revalidatePath(`/logistica/tabelas-frete/${carrierName.toLowerCase()}`);
    return { success: true };
}
