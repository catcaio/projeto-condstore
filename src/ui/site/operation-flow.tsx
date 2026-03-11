import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface OpStep {
    icon: LucideIcon;
    label: string;
    detail: string;
    accent?: string;
}

interface OperationFlowProps {
    steps: OpStep[];
    className?: string;
}

/**
 * Premium vertical operation flow — the centerpiece "live system" block.
 * Shows each step as a node on a connected vertical line.
 */
export function OperationFlow({ steps, className }: OperationFlowProps) {
    return (
        <div className={cn('relative', className)}>
            {/* Vertical connector line */}
            <div className="absolute left-5 md:left-6 top-0 bottom-0 w-px bg-gradient-to-b from-[hsl(var(--ui-accent-blue)/0.4)] via-[hsl(var(--ui-accent-blue)/0.15)] to-transparent" />

            <div className="flex flex-col gap-0">
                {steps.map((step, i) => {
                    const Icon = step.icon;
                    const isLast = i === steps.length - 1;
                    const accent = step.accent || 'var(--ui-accent-blue)';

                    return (
                        <div key={step.label} className="group relative flex items-start gap-5 md:gap-6 py-5 md:py-6">
                            {/* Node dot */}
                            <div className="relative z-10 flex-shrink-0">
                                <div
                                    className={cn(
                                        'flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl transition-colors',
                                        `bg-[hsl(${accent}/0.1)]`
                                    )}
                                >
                                    <Icon className={cn('h-5 w-5 md:h-[22px] md:w-[22px]', `text-[hsl(${accent})]`)} />
                                </div>
                                {/* Pulse ring on hover */}
                                {!isLast && (
                                    <div className="absolute inset-0 rounded-xl border border-[hsl(var(--ui-accent-blue)/0.2)] opacity-0 group-hover:opacity-100 scale-110 transition-all" />
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 pt-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--ui-text-subtle))]">
                                        {String(i + 1).padStart(2, '0')}
                                    </span>
                                    <h3 className="text-base md:text-lg font-bold text-[hsl(var(--ui-text))] tracking-tight">
                                        {step.label}
                                    </h3>
                                </div>
                                <p className="text-sm text-[hsl(var(--ui-text-muted))] leading-relaxed max-w-md">
                                    {step.detail}
                                </p>
                            </div>

                            {/* Status badge (right side, desktop) */}
                            <div className="hidden lg:flex items-center self-center">
                                <span className={cn(
                                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold',
                                    `bg-[hsl(${accent}/0.08)] text-[hsl(${accent})]`
                                )}>
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-40', `bg-[hsl(${accent})]`)} />
                                        <span className={cn('relative inline-flex rounded-full h-1.5 w-1.5', `bg-[hsl(${accent})]`)} />
                                    </span>
                                    em execução
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
