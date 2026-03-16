import * as React from 'react';
import { Button } from '@/ui/components';
import { Send, Zap, Activity, AlertTriangle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusChip } from './index';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function formatTimeAgo(date: Date | string | null | undefined) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return formatDistanceToNow(d, { addSuffix: true, locale: ptBR });
}

export function AddNoteForm({ 
    onSubmit, 
    placeholder = "Adicionar uma nota operacional..." 
}: { 
    onSubmit: (note: string) => void | Promise<void>; 
    placeholder?: string;
}) {
    const [note, setNote] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!note.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await onSubmit(note);
            setNote('');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-2xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] p-1">
            <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder={placeholder}
                className="min-h-[80px] w-full resize-none bg-transparent px-3 py-2 text-sm text-[hsl(var(--ui-text))] outline-none placeholder:text-[hsl(var(--ui-text-subtle))]"
                disabled={isSubmitting}
            />
            <div className="flex items-center justify-between border-t border-[hsl(var(--ui-border))] px-2 py-2">
                <p className="text-[11px] font-medium text-[hsl(var(--ui-text-muted))] ml-1">
                    Enter para enviar, Shift+Enter para quebra
                </p>
                <Button 
                    type="submit" 
                    size="sm" 
                    className="h-7 rounded-full px-3 text-xs" 
                    disabled={!note.trim() || isSubmitting}
                >
                    {isSubmitting ? 'Salvando...' : 'Salvar nota'}
                    <Send className="ml-1.5 h-3 w-3" />
                </Button>
            </div>
        </form>
    );
}

export type FrankSuggestion = {
    id: string;
    title: string;
    description: string;
    actionLabel: string;
    onAction: () => void | Promise<void>;
    type: 'warning' | 'opportunity' | 'action';
};

export function FrankSuggestionsWidget({
    suggestions,
    title = "Insights & Ações (Frank)",
    isLoading = false
}: {
    suggestions: FrankSuggestion[];
    title?: string;
    isLoading?: boolean;
}) {
    if (isLoading) {
        return (
            <div className="flex flex-col gap-3 rounded-[1.5rem] border border-amber-200/30 bg-gradient-to-br from-amber-50/50 to-amber-100/30 dark:from-amber-950/20 dark:to-amber-900/10 p-5">
                <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 animate-pulse text-amber-500" />
                    <div className="h-4 w-32 animate-pulse rounded bg-amber-200 dark:bg-amber-800" />
                </div>
                <div className="mt-2 h-20 w-full animate-pulse rounded-xl bg-amber-100 dark:bg-amber-900/40" />
            </div>
        );
    }

    if (!suggestions?.length) {
        return null;
    }

    return (
        <div className="flex flex-col gap-3 rounded-[1.5rem] border border-amber-200 bg-gradient-to-br from-amber-50 to-white dark:border-amber-900/50 dark:from-amber-950/20 dark:to-[hsl(var(--ui-surface))] p-5 shadow-sm">
            <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
                    <Zap className="h-3.5 w-3.5 text-amber-600 dark:text-amber-500" />
                </div>
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-500">{title}</h3>
            </div>
            
            <div className="mt-2 flex flex-col gap-3">
                {suggestions.map((sug) => (
                    <div key={sug.id} className="group relative overflow-hidden rounded-xl border border-amber-200/50 bg-white dark:border-amber-800/50 dark:bg-[hsl(var(--ui-page))] p-3.5 transition-shadow hover:shadow-md">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    {sug.type === 'warning' ? <AlertTriangle className="h-3.5 w-3.5 text-rose-500" /> : null}
                                    {sug.type === 'opportunity' ? <Activity className="h-3.5 w-3.5 text-emerald-500" /> : null}
                                    <h4 className="text-sm font-semibold text-[hsl(var(--ui-text))]">{sug.title}</h4>
                                </div>
                                <p className="mt-1 text-xs text-[hsl(var(--ui-text-muted))]">{sug.description}</p>
                            </div>
                        </div>
                        <div className="mt-3 flex items-center justify-end border-t border-amber-100 dark:border-amber-900/30 pt-3">
                            <Button 
                                variant="secondary" 
                                size="sm" 
                                className="h-7 border-amber-200 bg-amber-50 text-xs text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/40"
                                onClick={() => sug.onAction()}
                            >
                                {sug.actionLabel}
                                <ArrowRight className="ml-1.5 h-3 w-3" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function OperationalTimelineWidget({
    history,
    isLoading = false
}: {
    history: any[];
    isLoading?: boolean;
}) {
    if (isLoading) {
        return (
            <div className="flex flex-col gap-4 animate-pulse p-2">
                <div className="h-10 w-full rounded-md bg-[hsl(var(--ui-border))]" />
                <div className="h-10 w-full rounded-md bg-[hsl(var(--ui-border))]" />
            </div>
        );
    }

    if (!history?.length) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-[hsl(var(--ui-border))] rounded-2xl mx-1 bg-[hsl(var(--ui-page))]">
                <Activity className="h-6 w-6 text-[hsl(var(--ui-text-muted))] mb-2 opacity-50" />
                <p className="text-sm font-medium text-[hsl(var(--ui-text-muted))]">Nenhum evento registrado</p>
                <p className="text-xs text-[hsl(var(--ui-text-subtle))] mt-1">Ações operacionais aparecerão aqui.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-0 border-l-2 border-[hsl(var(--ui-border))] ml-4 pl-4 space-y-6">
            {history.map((item, i) => (
                <div key={item.id} className="relative">
                    <div className="absolute -left-[23px] top-1 h-2.5 w-2.5 rounded-full border-2 border-[hsl(var(--ui-surface))] bg-blue-500 ring-2 ring-[hsl(var(--ui-page))]" />
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-[hsl(var(--ui-text))] capitalize">
                                {item.actionType.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--ui-text-subtle))]">
                                {formatTimeAgo(item.createdAt)}
                            </span>
                        </div>
                        <div className="text-xs text-[hsl(var(--ui-text-muted))]">
                            Por: <span className="font-medium">{item.actorId || 'Sistema'}</span> via {item.origin}
                        </div>
                        {item.afterState && (
                            <div className="mt-2 rounded-md bg-[hsl(var(--ui-page))] p-2 text-[10px] font-mono text-[hsl(var(--ui-text-muted))] overflow-x-auto border border-[hsl(var(--ui-border))]">
                                {JSON.stringify(item.afterState)}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
