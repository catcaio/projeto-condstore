import { Loader2 } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/ui/components/card';

export default function CockpitLoading() {
    return (
        <div className="space-y-5 p-6 min-h-screen os-root">
            <div className="h-8 w-48 animate-pulse rounded-md bg-[hsl(var(--ui-muted))]"></div>
            <div className="h-4 w-96 animate-pulse rounded-md bg-[hsl(var(--ui-muted))]/50 mb-4"></div>

            <Card variant="elevated">
                <CardHeader
                    heading={<div className="h-5 w-32 animate-pulse rounded bg-[hsl(var(--ui-muted))]" />}
                    subheading={<div className="h-4 w-60 animate-pulse rounded bg-[hsl(var(--ui-muted))]/50" />}
                />
                <CardContent className="p-4 pt-10">
                    <div className="flex h-40 items-center justify-center text-[hsl(var(--ui-text-muted))]">
                        <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--ui-accent-blue))]" />
                        <span className="ml-3 text-sm font-medium">Carregando dados...</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
