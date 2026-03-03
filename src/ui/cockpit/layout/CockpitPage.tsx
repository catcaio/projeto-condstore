import { ReactNode } from 'react';

interface CockpitPageProps {
    title: string;
    description: string;
    actions?: ReactNode;
    children: ReactNode;
}

export function CockpitPage({ title, description, actions, children }: CockpitPageProps) {
    return (
        <div className="flex-1 overflow-auto bg-[hsl(var(--ui-background))]">
            <div className="mx-auto w-full max-w-5xl py-8 px-6 space-y-8">
                {/* Standardized Cockpit Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[hsl(var(--ui-border))] pb-6">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--ui-text))] uppercase">
                            CONDSTORE OS: {title}
                        </h1>
                        <p className="mt-1 text-sm text-[hsl(var(--ui-text-muted))]">
                            {description}
                        </p>
                    </div>
                    {actions && <div className="flex items-center gap-2">{actions}</div>}
                </div>

                {/* Page Content */}
                <div className="space-y-6">
                    {children}
                </div>
            </div>
        </div>
    );
}
