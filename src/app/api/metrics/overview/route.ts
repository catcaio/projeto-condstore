import { NextResponse } from 'next/server';
import { messageRepository } from '@/infra/repositories/message.repository';
// Import simulationRepository gracefully - if it fails (it shouldn't based on previous checks), we handle it
import { simulationRepository } from '@/infra/repositories/simulation.repository';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // 1. Message Metrics (Today + Total + Breakdown)
        const [msgsToday, msgsTotal] = await Promise.all([
            messageRepository.getMetricsToday(),
            messageRepository.getMetricsTotal(),
        ]);

        // 2. Simulation Metrics (Try/Catch wrapper in case table missing/error)
        let totalSimulations = 0;
        let simulationsToday = 0;
        try {
            [totalSimulations, simulationsToday] = await Promise.all([
                simulationRepository.countTotal(),
                simulationRepository.countToday()
            ]);
        } catch (err) {
            console.warn('Simulation metrics failed (table missing?):', err);
            // Fallback to 0 as requested
        }

        // 3. Construct Response
        return NextResponse.json({
            totalMessages: msgsTotal.total,
            totalSimulations: totalSimulations,
            messagesToday: msgsToday.total,
            simulationsToday: simulationsToday,
            intentsBreakdownToday: msgsToday.breakdown,
            intentsBreakdownTotal: msgsTotal.breakdown
        }, { status: 200 });

    } catch (err) {
        console.error('Metrics overview failed:', err);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
