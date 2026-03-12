import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/ui/components/card';
import { Badge } from '@/ui/components/badge';
import { Button } from '@/ui/components/button';
import { Check, X, MessageSquare, Tag, Eye } from 'lucide-react';
import Link from 'next/link';

interface CapturedIntent {
    id: string;
    conversationId: string | null;
    messageText: string;
    detectedIntent: string | null;
    confidence: string | null;
    createdAt: string;
}

export function IntentReviewPanel({ intent, onProcessed }: { intent: CapturedIntent; onProcessed: () => void }) {
    const [submitting, setSubmitting] = useState(false);

    const handleAction = async (action: 'validate' | 'ignore') => {
        setSubmitting(true);
        try {
            const res = await fetch(`/api/cockpit/frank/intents/${intent.id}/${action}`, {
                method: 'POST',
            });
            if (res.ok) {
                onProcessed();
            }
        } catch (e) {
            console.error('Failed to process intent', e);
        }
        setSubmitting(false);
    };

    return (
        <Card className="hover:shadow-md transition-shadow relative overflow-hidden group border-[hsl(var(--ui-border))]">
            <CardHeader className="bg-[hsl(var(--ui-bg-subtle))] p-4 flex flex-row items-center justify-between space-y-0">
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-[hsl(var(--ui-text-muted))] uppercase tracking-wider">
                        Detectado
                    </span>
                    <Badge variant="outline" className="w-fit bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300">
                        <Tag className="mr-1 h-3 w-3" />
                        {intent.detectedIntent || 'DESCONHECIDO'}
                    </Badge>
                </div>
                {intent.confidence && (
                    <span className="text-xs font-medium px-2 py-1 rounded bg-[hsl(var(--ui-bg))]">
                        {Math.round(parseFloat(intent.confidence) * 100)}% Match
                    </span>
                )}
            </CardHeader>
            <CardContent className="p-4 py-5 prose-sm max-w-none text-default min-h-[100px]">
                <div className="flex gap-2">
                    <MessageSquare className="h-4 w-4 mt-1 text-[hsl(var(--ui-text-muted))]" />
                    <p className="text-sm italic font-serif leading-relaxed line-clamp-4">
                        "{intent.messageText}"
                    </p>
                </div>
                {intent.conversationId && (
                    <Link 
                        href={`/cockpit/inbox/conversations/${intent.conversationId}`} 
                        className="mt-4 flex items-center text-xs text-[hsl(var(--ui-accent-blue))] hover:underline"
                        target="_blank"
                        rel="noreferrer"
                    >
                        <Eye className="mr-1 h-3 w-3" />
                        Ver na Conversa
                    </Link>
                )}
            </CardContent>
            <CardFooter className="p-0 flex h-10 border-t border-[hsl(var(--ui-border))]">
                <Button
                    variant="ghost"
                    className="flex-1 rounded-none h-full bg-white hover:bg-green-50 text-green-700 hover:text-green-800 border-r border-[hsl(var(--ui-border))]"
                    onClick={() => handleAction('validate')}
                    disabled={submitting}
                >
                    <Check className="mr-2 h-4 w-4" />
                    Validar
                </Button>
                <Button
                    variant="ghost"
                    className="flex-1 rounded-none h-full bg-white hover:bg-slate-50 text-[hsl(var(--ui-text-muted))] hover:text-slate-800"
                    onClick={() => handleAction('ignore')}
                    disabled={submitting}
                >
                    <X className="mr-2 h-4 w-4" />
                    Ignorar
                </Button>
            </CardFooter>
        </Card>
    );
}
