import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { getDb } from '@/infra/db';
import { carrierPolicies } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { TableDrivenAdapter } from '@/modules/freight/table-driven-adapter';
import { resolveCarrierZone, extractStateFromCep } from '@/core/freight/zone-resolver';

export const dynamic = 'force-dynamic';

interface VolumeRow {
    length: number; // cm
    width: number;  // cm
    height: number; // cm
    qty: number;
}

interface SimulateBody {
    cep: string;
    insuranceValue?: number;
    carrierName?: string; // 'auto' or specific name
    volumes: VolumeRow[];
    totalWeight: number; // kg
}

export async function POST(request: NextRequest) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    try {
        const body: SimulateBody = await request.json();
        const { cep, insuranceValue, carrierName, volumes, totalWeight } = body;

        if (!cep || !volumes || volumes.length === 0 || !totalWeight) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Missing required fields: cep, volumes, totalWeight');
        }

        const tenantId = auth.session.tenantId;
        const cubageFactor = 300; // default, will be overridden per-carrier below
        const state = extractStateFromCep(cep);

        // Determine carriers to simulate
        const db = await getDb();
        let carrierNames: string[] = [];
        if (carrierName && carrierName !== 'auto') {
            carrierNames = [carrierName];
        } else {
            const allPolicies = await db.select().from(carrierPolicies).where(and(
                eq(carrierPolicies.tenantId, tenantId),
                eq(carrierPolicies.isActive, true),
            ));
            carrierNames = allPolicies.map(p => p.carrierName);
        }

        // Compute volume-level metrics
        const volumeDetails = volumes.map(v => {
            const cubedWeight = (v.length * v.width * v.height * v.qty) / (1000000 / cubageFactor);
            return {
                ...v,
                volumetry: (v.length * v.width * v.height * v.qty) / 1000000, // m³
                cubedWeight: Math.round(cubedWeight * 100) / 100,
            };
        });

        const totalVolumes = volumes.reduce((s, v) => s + v.qty, 0);
        const totalCubedWeight = volumeDetails.reduce((s, v) => s + v.cubedWeight, 0);
        const chargedWeight = Math.max(totalWeight, totalCubedWeight);

        // Simulate for each carrier
        const results: any[] = [];
        for (const cn of carrierNames) {
            const adapter = new TableDrivenAdapter(cn, tenantId);

            // Find the largest volume row to use as representative dimensions
            const largest = volumes.reduce((best, v) => {
                return (v.length * v.width * v.height) > (best.length * best.width * best.height) ? v : best;
            }, volumes[0]);

            const breakdown = await adapter.calculateFreight({
                originCep: '88131640',
                destinationCep: cep.replace(/\D/g, ''),
                weightInKg: chargedWeight,
                widthCm: largest.width,
                heightCm: largest.height,
                lengthCm: largest.length,
                insuranceValue: insuranceValue || 0,
                packageType: 'box',
            });

            const zoneCode = await resolveCarrierZone({
                tenantId,
                carrierName: cn,
                cep: cep.replace(/\D/g, ''),
            });

            results.push({
                carrierName: cn,
                zoneCode: zoneCode || 'NOT_FOUND',
                breakdown,
            });
        }

        return NextResponse.json({
            ok: true,
            data: {
                state,
                totalVolumes,
                totalWeight,
                totalCubedWeight: Math.round(totalCubedWeight * 100) / 100,
                chargedWeight: Math.round(chargedWeight * 100) / 100,
                dimensionSource: 'manual_override',
                volumeDetails,
                results,
            },
        });
    } catch (err) {
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Simulation failed');
    }
}
