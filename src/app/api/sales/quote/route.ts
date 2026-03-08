/**
 * Sales Quote API.
 *
 * POST /api/sales/quote
 * Resolves packing profiles for items, computes volumes,
 * runs TableDrivenAdapter for each active carrier,
 * logs the simulation, and returns carrier quotes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { getDb } from '@/infra/db';
import { carrierPolicies } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { resolvePackingDimensions, type ResolvedDimensions } from '@/modules/freight/packing-resolver';
import { TableDrivenAdapter } from '@/modules/freight/table-driven-adapter';
import { resolveCarrierZone, extractStateFromCep } from '@/core/freight/zone-resolver';
import { loadOperationalSettings } from '@/core/freight/operational-settings';
import { logFreightSimulation, computeWeightBand, computeVolumeBand } from '@/modules/freight/freight-audit';

export const dynamic = 'force-dynamic';

interface QuoteItem {
    productRef: string;
    quantity: number;
}

interface QuoteBody {
    cepDestino: string;
    items: QuoteItem[];
}

export async function POST(request: NextRequest) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    try {
        const body: QuoteBody = await request.json();
        const { cepDestino, items } = body;

        if (!cepDestino || !items || items.length === 0) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Missing required fields: cepDestino, items[]');
        }

        const tenantId = auth.session.tenantId;
        const opSettings = await loadOperationalSettings(tenantId);
        const cubageFactor = opSettings.defaultCubageFactor;
        const originCep = opSettings.defaultOriginCep;
        const cepClean = cepDestino.replace(/\D/g, '');
        const state = extractStateFromCep(cepClean);

        // ─── 1. Resolve packing for each item ──────────────────────────────
        const resolvedItems: ResolvedDimensions[] = [];
        for (const item of items) {
            const resolved = await resolvePackingDimensions({
                tenantId,
                productRef: item.productRef,
                quantity: item.quantity,
                defaultUnitWeight: 0.5, // fallback 500g per unit
            });
            resolvedItems.push(resolved);
        }

        // ─── 2. Consolidate volumes ────────────────────────────────────────
        const volumes = resolvedItems.flatMap(r => {
            if (r.volumeDetails && r.volumeDetails.length > 0) {
                return r.volumeDetails.map(v => ({
                    length: v.length,
                    width: v.width,
                    height: v.height,
                    qty: 1,
                }));
            }
            // Fallback: single volume from resolved dims
            return [{
                length: r.length || 20,
                width: r.width || 15,
                height: r.height || 10,
                qty: r.volumes || 1,
            }];
        });

        const totalWeight = resolvedItems.reduce((s, r) => s + r.totalWeight, 0);
        const totalVolumes = volumes.reduce((s, v) => s + v.qty, 0);

        // Compute cubage
        const volumeDetails = volumes.map(v => {
            const cubedWeight = (v.length * v.width * v.height * v.qty) / (1000000 / cubageFactor);
            return { ...v, cubedWeight: Math.round(cubedWeight * 100) / 100 };
        });
        const totalCubedWeight = volumeDetails.reduce((s, v) => s + v.cubedWeight, 0);
        const chargedWeight = Math.max(totalWeight, totalCubedWeight);

        // ─── 3. Find active carriers ───────────────────────────────────────
        const db = await getDb();
        const allPolicies = await db.select().from(carrierPolicies).where(and(
            eq(carrierPolicies.tenantId, tenantId),
            eq(carrierPolicies.isActive, true),
        ));
        const carrierNames = allPolicies.map(p => p.carrierName);

        if (carrierNames.length === 0) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'No active carriers found for this tenant');
        }

        // ─── 4. Quote each carrier ─────────────────────────────────────────
        const largest = volumes.reduce((best, v) => {
            return (v.length * v.width * v.height) > (best.length * best.width * best.height) ? v : best;
        }, volumes[0]);

        const quotes: { carrier: string; price: number; deadline: number; zoneCode: string }[] = [];

        for (const cn of carrierNames) {
            try {
                const adapter = new TableDrivenAdapter(cn, tenantId);
                const breakdown = await adapter.calculateFreight({
                    originCep,
                    destinationCep: cepClean,
                    weightInKg: chargedWeight,
                    widthCm: largest.width,
                    heightCm: largest.height,
                    lengthCm: largest.length,
                    insuranceValue: 0,
                    packageType: 'box',
                });

                const zoneCode = await resolveCarrierZone({
                    tenantId,
                    carrierName: cn,
                    cep: cepClean,
                });

                if (breakdown && breakdown.totalFreight > 0) {
                    quotes.push({
                        carrier: cn,
                        price: Math.round(breakdown.totalFreight * 100) / 100,
                        deadline: breakdown.deliveryDays || 0,
                        zoneCode: zoneCode || 'N/A',
                    });
                }
            } catch (err) {
                // Skip carrier if calculation fails
                continue;
            }
        }

        // Sort by price ascending
        quotes.sort((a, b) => a.price - b.price);

        // ─── 5. Log simulation ─────────────────────────────────────────────
        const bestQuote = quotes[0];
        const simulationId = await logFreightSimulation({
            tenantId,
            cep: cepClean,
            zoneCode: bestQuote?.zoneCode,
            carrierConsidered: carrierNames,
            carrierSelected: bestQuote?.carrier,
            totalWeight,
            cubedWeight: totalCubedWeight,
            chargedWeight,
            totalVolumes,
            volumeDetails,
            dimensionSource: resolvedItems[0]?.source || 'default',
            packingRuleVersion: opSettings.ruleVersion,
            quotedFreight: bestQuote?.price,
            breakdownJson: quotes,
            strategyUsed: 'sales_quote',
        });

        return NextResponse.json({
            ok: true,
            data: {
                simulationId,
                state,
                volumes: volumeDetails,
                totalWeight: Math.round(totalWeight * 100) / 100,
                chargedWeight: Math.round(chargedWeight * 100) / 100,
                quotes,
            },
        });
    } catch (err: any) {
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, err.message || 'Quote failed');
    }
}
