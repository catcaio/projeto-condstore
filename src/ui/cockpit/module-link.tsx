'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { trackAppEvent } from '@/ui/lib/track-app';

export function ModuleLink({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
    return (
        <Link 
            href={`/cockpit/rooms/${id}`} 
            className={className}
            onClick={() => trackAppEvent({ type: 'module_clicked', metadata: { module: id } })}
        >
            {children}
        </Link>
    );
}
