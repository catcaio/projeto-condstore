import { useState, useEffect, ChangeEvent } from 'react';
import { Button, Card, CardContent, CardFooter, CardHeader } from '@/ui/components';
import { Send, Copy, Pencil, X, Sparkles, Trash2 } from 'lucide-react';

interface Suggestion {
    id: string;
    playbookId: string | null;
    suggestedResponse: string;
    confidence: string;
    status: string;
    createdAt: string;
}

export function FrankSuggestionPanel({
    conversationId,
    onApproveAndSend,
}: {
    conversationId: string;
    onApproveAndSend: (text: string, suggestionId: string) => Promise<boolean>;
}) {
    const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editedText, setEditedText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchSuggestions = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/cockpit/frank/suggestions?conversationId=${conversationId}`);
                if (!res.ok) throw new Error('Failed to fetch');
                const { data } = await res.json();
                if (isMounted && data && data.length > 0) {
                    setSuggestion(data[0]);
                    setEditedText(data[0].suggestedResponse);
                } else if (isMounted) {
                    setSuggestion(null);
                }
            } catch (err) {
                console.error('Error fetching frank suggestions', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchSuggestions();

        const interval = setInterval(fetchSuggestions, 30000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [conversationId]);

    if (loading && !suggestion) return null;
    if (!suggestion) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(editedText);
    };

    const handleSend = async () => {
        setIsSubmitting(true);
        const success = await onApproveAndSend(editedText, suggestion.id);
        setIsSubmitting(false);
        if (success) {
            setSuggestion(null);
        }
    };

    const handleReject = async () => {
        setIsRejecting(true);
        try {
            const res = await fetch(`/api/cockpit/frank/suggestions/${suggestion.id}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            if (res.ok) {
                setSuggestion(null);
            }
        } catch (e) {
            console.error('Failed to reject suggestion', e);
        }
        setIsRejecting(false);
    };

    return (
        <Card className="w-full border border-gray-200 bg-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] mt-4 overflow-hidden rounded-xl">
            <CardHeader className="py-2.5 px-4 flex flex-row items-center justify-between space-y-0 bg-gray-50/50 border-b border-gray-100"
                heading={
                    <div className="text-[13px] font-bold flex items-center text-purple-700 tracking-wide uppercase">
                        <Sparkles className="h-3.5 w-3.5 mr-1.5 text-purple-500" />
                        Sugestão do Frank
                    </div>
                }
                actions={
                    <div className="flex space-x-2 text-[10px] font-medium text-gray-500">
                        {suggestion.playbookId && (
                            <span className="bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-full capitalize">
                                Fluxo Otimizado
                            </span>
                        )}
                        <span className="bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                            {(parseFloat(suggestion.confidence) * 100).toFixed(0)}% trust
                        </span>
                    </div>
                }
            />
            <CardContent className="px-5 py-4">
                {isEditing ? (
                    <textarea 
                        value={editedText}
                        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setEditedText(e.target.value)}
                        className="w-full min-h-[100px] text-sm bg-white border border-[hsl(var(--ui-border))] rounded-md p-2 focus:ring-[hsl(var(--ui-accent-blue))]"
                    />
                ) : (
                    <div className="text-sm whitespace-pre-wrap text-slate-700 p-3 bg-white border rounded-md">
                        {editedText}
                    </div>
                )}
            </CardContent>
            <CardFooter className="px-4 py-3 flex flex-wrap-reverse sm:flex-nowrap gap-2 justify-between bg-gray-50/80 rounded-b-xl border-t border-gray-100">
                <div className="flex w-full sm:w-auto space-x-2 justify-between sm:justify-start">
                    {isEditing ? (
                        <>
                            <Button size="sm" variant="ghost" className="h-8 px-2 text-slate-500" onClick={() => setIsEditing(false)}>
                                <X className="h-4 w-4 mr-1" /> Cancelar
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button size="sm" variant="ghost" className="h-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={handleReject} disabled={isRejecting}>
                                <Trash2 className="h-3.5 w-3.5 mr-1" /> Ignorar
                            </Button>
                            <Button size="sm" variant="secondary" className="h-8 bg-white" onClick={handleCopy}>
                                <Copy className="h-3.5 w-3.5 mr-1" /> Copiar
                            </Button>
                            <Button size="sm" variant="secondary" className="h-8 bg-white" onClick={() => setIsEditing(true)}>
                                <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                            </Button>
                        </>
                    )}
                </div>
                
                <Button 
                    size="sm" 
                    className="h-8.5 w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition-all"
                    onClick={handleSend}
                    disabled={isSubmitting || isRejecting || !editedText.trim()}
                >
                    {isSubmitting ? (
                        'Enviando...'
                    ) : (
                        <>
                            <Send className="h-3.5 w-3.5 mr-1.5" /> Enviar Mensagem
                        </>
                    )}
                </Button>
            </CardFooter>
        </Card>
    );
}
