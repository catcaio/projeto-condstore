import React, { ReactNode } from 'react';

export interface PageContainerProps {
    children: ReactNode;
    className?: string;
}

export function PageContainer({ children, className = '' }: PageContainerProps) {
    return (
        <div className={`p-6 md:p-8 lg:p-10 mx-auto max-w-[1400px] w-full min-h-screen os-root flex flex-col gap-6 ${className}`}>
            {children}
        </div>
    );
}
