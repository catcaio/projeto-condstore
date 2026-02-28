import * as React from 'react';
import { AlertTriangle, Lock } from 'lucide-react';
import Link from 'next/link';

export type FinOpsStatus = 'unlocked' | 'degraded_preemptive' | 'degraded' | 'locked';

export function FinOpsStatusUI({ status }: { status: FinOpsStatus }) {
    if (status === 'unlocked') return null;

    if (status === 'degraded_preemptive') {
        return (
            <div
                role="status"
                aria-live="polite"
                className="w-full bg-[#fef08a] text-[#854d0e] px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium border-b border-[#fde047]"
            >
                <AlertTriangle className="h-4 w-4" />
                <span>Uso próximo ao limite. Considere revisar seu plano.</span>
            </div>
        );
    }

    if (status === 'degraded') {
        return (
            <div
                role="status"
                aria-live="polite"
                className="w-full bg-[#fed7aa] text-[#c2410c] px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium border-b border-[#fdba74]"
            >
                <AlertTriangle className="h-4 w-4" />
                <span>Uso atingiu o limite de segurança (Soft Limit). Serviços podem ser suspensos em breve.</span>
            </div>
        );
    }

    if (status === 'locked') {
        return (
            <div
                role="status"
                aria-live="polite"
                className="w-full bg-[#fecaca] text-[#b91c1c] px-4 py-2 flex flex-col sm:flex-row items-center justify-center gap-2 text-sm font-medium border-b border-[#fca5a5]"
            >
                <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    <span>Conta limitada por atingir o limite de uso (Hard Limit).</span>
                </div>
                <Link href="/cockpit">
                    <span className="font-bold underline cursor-pointer hover:text-[#991b1b]">
                        Regularizar agora
                    </span>
                </Link>
            </div>
        );
    }

    return null;
}
