import { AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/ui/components/card';
import Link from 'next/link';

export default function ServerErrorState({
    title = 'Erro ao carregar',
    message,
    requestId,
    status,
    actionHref,
}: {
    title?: string;
    message?: string;
    requestId?: string;
    status?: number;
    actionHref?: string;
}) {
    return (
        <Card variant="elevated" className="border-red-500/20 bg-red-500/5 my-4">
            <CardContent className="flex flex-col items-center p-8 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                    <AlertCircle className="h-5 w-5" />
                </div>
                <h3 className="mb-1 text-lg font-semibold tracking-tight text-[hsl(var(--ui-text))]">
                    {title} {status ? `(${status})` : ''}
                </h3>
                {message && (
                    <p className="mb-4 text-sm text-[hsl(var(--ui-text-muted))]">
                        {message}
                    </p>
                )}
                {requestId && (
                    <div className="mb-4 w-full rounded-md bg-[hsl(var(--ui-muted))] p-2 text-left text-xs font-mono text-[hsl(var(--ui-text-muted))]">
                        Request ID: {requestId}
                    </div>
                )}
                {actionHref && (
                    <Link
                        href={actionHref}
                        className="mt-2 inline-flex h-9 items-center justify-center rounded-lg bg-[hsl(var(--ui-text))] px-4 text-sm font-medium text-[hsl(var(--ui-bg))] transition-colors hover:opacity-90"
                    >
                        Tentar novamente
                    </Link>
                )}
            </CardContent>
        </Card>
    );
}
