import { cn } from '@/lib/utils';

interface SectionIntroProps {
    eyebrow?: string;
    title: string;
    description?: string;
    align?: 'left' | 'center';
    className?: string;
}

export function SectionIntro({ eyebrow, title, description, align = 'center', className }: SectionIntroProps) {
    return (
        <div
            className={cn(
                'mb-12 md:mb-16',
                align === 'center' && 'text-center mx-auto max-w-3xl',
                align === 'left' && 'max-w-2xl',
                className
            )}
        >
            {eyebrow && (
                <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(var(--ui-accent-blue))] mb-4">
                    {eyebrow}
                </span>
            )}
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-[hsl(var(--ui-text))] leading-[1.1]">
                {title}
            </h2>
            {description && (
                <p className="mt-5 text-lg md:text-xl text-[hsl(var(--ui-text-muted))] leading-relaxed font-light">
                    {description}
                </p>
            )}
        </div>
    );
}
