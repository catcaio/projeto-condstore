'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/ui/components';
import type { CockpitAlert } from '../../data/shared';

export interface WorkspaceAlertBannerProps {
    alerts: CockpitAlert[];
}

export function WorkspaceAlertBanner({ alerts }: WorkspaceAlertBannerProps) {
    const criticalAlerts = alerts.filter((a) => a.priority === 'critical' || a.priority === 'warning');

    if (criticalAlerts.length === 0) return null;

    return (
        <div className="space-y-2">
            {criticalAlerts.slice(0, 2).map((alert) => (
                <div
                    key={alert.id}
                    className={`p-3 rounded-xl border flex items-start justify-between gap-3 text-xs ${
                        alert.priority === 'critical'
                            ? 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-300'
                            : 'bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300'
                    }`}
                >
                    <div className="flex items-start gap-2.5">
                        <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
                        <div>
                            <span className="font-bold">{alert.title}</span>
                            <p className="mt-0.5 opacity-90">{alert.description}</p>
                        </div>
                    </div>
                    {alert.href && (
                        <Link href={alert.href}>
                            <Button size="sm" variant="secondary" className="shrink-0 text-xs">
                                Resolver
                            </Button>
                        </Link>
                    )}
                </div>
            ))}
        </div>
    );
}

export interface WorkspaceFallbackBannerProps {
    isRealData: boolean;
    fallbackReason?: string;
    partialBlocks: string[];
}

export function WorkspaceFallbackBanner({ isRealData, fallbackReason, partialBlocks }: WorkspaceFallbackBannerProps) {
    if (isRealData) return null;

    return (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 sm:px-6 py-2 text-xs text-red-700 dark:text-red-300 font-medium flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>
                Modo Fallback Ativo (Diagnostico): source=fallback | fallbackReason={fallbackReason ?? 'none'} | partialBlocks=[{partialBlocks.join(', ')}]
            </span>
        </div>
    );
}
