import { LucideProps } from 'lucide-react';
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import * as LucideIcons from 'lucide-react';

export type IconName = keyof typeof LucideIcons;

interface IconProps extends LucideProps {
    name: IconName;
}

export const Icon = forwardRef<SVGSVGElement, IconProps>(
    ({ name, className, ...props }, ref) => {
        const LucideIcon = LucideIcons[name] as React.ElementType;

        if (!LucideIcon) {
            return null;
        }

        return (
            <LucideIcon
                ref={ref}
                className={cn('h-4 w-4', className)}
                {...props}
            />
        );
    }
);

Icon.displayName = 'Icon';
