'use client';

import { useTransition, useState } from 'react';
import { Button } from '@/ui/components';
import { Play } from 'lucide-react';
import { runProcessorNow } from '../actions';
import { useRouter } from 'next/navigation';

export function RunProcessorButton({ disabled }: { disabled?: boolean }) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleRun = () => {
        startTransition(async () => {
            const result = await runProcessorNow();
            if (result.success) {
                alert(result.message);
                router.refresh();
            } else {
                alert('Erro: ' + result.error);
            }
        });
    };

    return (
        <Button
            onClick={handleRun}
            disabled={isPending || disabled}
            variant="primary"
            size="sm"
            className="gap-2"
        >
            <Play className="h-4 w-4" />
            {isPending ? 'Rodando...' : 'Rodar Processor Agora'}
        </Button>
    );
}
