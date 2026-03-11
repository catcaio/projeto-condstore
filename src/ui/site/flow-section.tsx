import { cn } from '@/lib/utils';

export interface FlowStep {
    number: string;
    title: string;
    description: string;
}

interface FlowSectionProps {
    steps: FlowStep[];
    className?: string;
}

export function FlowSection({ steps, className }: FlowSectionProps) {
    return (
        <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-6', className)}>
            {steps.map((step, i) => (
                <div key={step.number} className="relative flex flex-col gap-4">
                    {/* Connector line (desktop only) */}
                    {i < steps.length - 1 && (
                        <div className="hidden lg:block absolute top-5 left-[calc(50%+1.5rem)] w-[calc(100%-3rem)] h-px bg-gradient-to-r from-[hsl(var(--ui-border))] to-[hsl(var(--ui-border)/0.3)]" />
                    )}

                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[hsl(var(--ui-accent-blue)/0.3)] bg-[hsl(var(--ui-accent-blue)/0.08)] text-sm font-bold text-[hsl(var(--ui-accent-blue))]">
                            {step.number}
                        </span>
                        <h3 className="text-base font-bold text-[hsl(var(--ui-text))] tracking-tight">
                            {step.title}
                        </h3>
                    </div>

                    <p className="text-sm text-[hsl(var(--ui-text-muted))] leading-relaxed pl-[3.25rem] lg:pl-0">
                        {step.description}
                    </p>
                </div>
            ))}
        </div>
    );
}
