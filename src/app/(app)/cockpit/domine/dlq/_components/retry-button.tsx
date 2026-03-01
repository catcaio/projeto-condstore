'use client';

import { useTransition } from 'react';
import { Button } from '@/ui/components';
import { RotateCw } from 'lucide-react';
import { retryDomineEvent } from '../../actions';
import { useRouter } from 'next/navigation';

export function RetryButton({ tenantId, eventId, disabled }: { tenantId: string; eventId: string; disabled?: boolean }) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleRetry = () => {
        startTransition(async () => {
            const result = await retryDomineEvent(tenantId, eventId);
            if (result.success) {
                alert('Evento reenviado para a fila principal.');
                router.refresh();
            } else {
                alert('Erro ao reenviar o evento.');
            }
        });
    };

    return (
        <Button
            onClick={handleRetry}
            disabled={isPending || disabled}
            variant="ghost"
            size="sm"
            className="h-8 text-[hsl(var(--cockpit-accent))] hover:bg-[hsl(var(--cockpit-accent)/0.1)] gap-1 px-2"
        >
            <RotateCw className="h-3 w-3" />
            {isPending ? 'Retrying...' : 'Retry'}
        </Button>
    );
}
