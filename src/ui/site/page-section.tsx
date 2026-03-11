import { cn } from '@/lib/utils';

interface PageSectionProps {
    children: React.ReactNode;
    className?: string;
    id?: string;
    borderTop?: boolean;
    spacing?: 'sm' | 'md' | 'lg' | 'xl';
}

const spacingMap = {
    sm: 'py-12 md:py-16',
    md: 'py-16 md:py-24',
    lg: 'py-20 md:py-32',
    xl: 'py-24 md:py-40',
};

export function PageSection({ children, className, id, borderTop, spacing = 'lg' }: PageSectionProps) {
    return (
        <section
            id={id}
            className={cn(
                spacingMap[spacing],
                borderTop && 'border-t border-[hsl(var(--ui-border)/0.4)]',
                className
            )}
        >
            {children}
        </section>
    );
}
