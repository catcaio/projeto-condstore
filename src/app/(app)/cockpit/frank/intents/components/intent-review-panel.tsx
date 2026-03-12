import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/ui/components/card';
import { Badge } from '@/ui/components/badge';
import { Button } from '@/ui/components/button';
import { Check, X, MessageSquare, Tag, Eye, Link as LinkIcon, PlusCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface CapturedIntent {
    id: string;
    conversationId: string | null;
    messageText: string;
    detectedIntent: string | null;
    confidence: string | null;
    entities: Record<string, any> | null;
    createdAt: string;
}

interface PlaybookOption {
    id: string;
    title: string;
    intent: string;
}

export function IntentReviewPanel({ intent, playbooks, onProcessed }: { intent: CapturedIntent; playbooks: PlaybookOption[]; onProcessed: () => void }) {
    const [submitting, setSubmitting] = useState(false);
    const [viewMode, setViewMode] = useState<'review' | 'link' | 'create'>('review');
    
    // Form fields for linking existing
    const [selectedPlaybook, setSelectedPlaybook] = useState<string>('');

    // Form fields for creation
    const [createName, setCreateName] = useState('');
    const [createResponse, setCreateResponse] = useState('');

    const handleIgnore = async () => {
        setSubmitting(true);
        try {
            const res = await fetch(`/api/cockpit/frank/intents/${intent.id}/ignore`, { method: 'POST' });
            if (res.ok) onProcessed();
        } catch (e) {
            console.error('Failed to ignore intent', e);
        }
        setSubmitting(false);
    };

    const handleLink = async () => {
        if (!selectedPlaybook) return;
        setSubmitting(true);
        try {
            const res = await fetch(`/api/cockpit/frank/intents/${intent.id}/link-playbook`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playbookId: selectedPlaybook })
            });
            if (res.ok) onProcessed();
        } catch (e) {
            console.error('Failed to link playbook', e);
        }
        setSubmitting(false);
    };

    const handleCreate = async () => {
        if (!createName || !createResponse) return;
        setSubmitting(true);
        try {
            const entitiesList = intent.entities ? Object.keys(intent.entities) : [];
            const intentToUse = intent.detectedIntent || 'OUTRO';

            const res = await fetch(`/api/cockpit/frank/intents/${intent.id}/create-playbook`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: createName,
                    intent: intentToUse,
                    responseBase: createResponse,
                    triggerPhrases: [intent.messageText],
                    relatedEntities: entitiesList,
                    requiresConfirmation: false,
                    requiresHumanHandoff: false,
                    priority: 0,
                    status: 'draft',
                    tags: ['learnt_from_intent']
                })
            });
            if (res.ok) onProcessed();
        } catch (e) {
            console.error('Failed to create playbook', e);
        }
        setSubmitting(false);
    };

    const renderReviewState = () => (
        <>
            <CardContent className="p-4 py-5 prose-sm max-w-none text-default min-h-[100px] flex-1">
                <div className="flex gap-2">
                    <MessageSquare className="h-4 w-4 mt-1 text-[hsl(var(--ui-text-muted))]" />
                    <p className="text-sm italic font-serif leading-relaxed line-clamp-4">
                        "{intent.messageText}"
                    </p>
                </div>
                {intent.conversationId && (
                    <Link 
                        href={`/cockpit/conversations/${intent.conversationId}`} 
                        className="mt-4 flex items-center text-xs text-[hsl(var(--ui-accent-blue))] hover:underline"
                        target="_blank"
                        rel="noreferrer"
                    >
                        <Eye className="mr-1 h-3 w-3" />
                        Ver na Conversa
                    </Link>
                )}
            </CardContent>
            <CardFooter className="p-0 flex flex-col h-auto border-t border-[hsl(var(--ui-border))]">
                <div className="flex w-full h-10">
                    <Button
                        variant="ghost"
                        className="flex-1 rounded-none h-full bg-white hover:bg-green-50 text-green-700 hover:text-green-800 border-r border-[hsl(var(--ui-border))]"
                        onClick={() => setViewMode('link')}
                        disabled={submitting}
                    >
                        <LinkIcon className="mr-2 h-4 w-4" />
                        Vincular
                    </Button>
                    <Button
                        variant="ghost"
                        className="flex-1 rounded-none h-full bg-white hover:bg-purple-50 text-purple-700 hover:text-purple-800 border-r border-[hsl(var(--ui-border))]"
                        onClick={() => {
                            setCreateName(`Answer for: ${intent.detectedIntent || 'Unknown'}`);
                            setCreateResponse('Sua resposta aqui...');
                            setViewMode('create');
                        }}
                        disabled={submitting}
                    >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Criar
                    </Button>
                    <Button
                        variant="ghost"
                        className="flex-none rounded-none h-full px-4 bg-white hover:bg-slate-50 text-[hsl(var(--ui-text-muted))] hover:text-slate-800"
                        onClick={handleIgnore}
                        disabled={submitting}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </CardFooter>
        </>
    );

    const renderLinkState = () => (
        <>
            <CardContent className="p-4 py-5 flex-1 flex flex-col gap-4">
                <p className="text-sm text-[hsl(var(--ui-text-muted))]">Selecione um playbook existente para ensinar o Frank a responder consultas como essa.</p>
                
                <div className="space-y-2">
                    <label className="text-xs font-semibold">Playbook</label>
                    <select 
                        className="w-full h-9 rounded-md border border-[hsl(var(--ui-border))] text-sm px-2 text-[hsl(var(--ui-text))]"
                        value={selectedPlaybook}
                        onChange={(e) => setSelectedPlaybook(e.target.value)}
                    >
                        <option value="">-- Selecione --</option>
                        {playbooks.map(p => (
                            <option key={p.id} value={p.id}>{p.intent} - {p.title}</option>
                        ))}
                    </select>
                </div>
            </CardContent>
            <CardFooter className="p-0 flex h-10 border-t border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))]">
                <Button variant="ghost" className="flex-none rounded-none h-full px-4 border-r border-[hsl(var(--ui-border))]" onClick={() => setViewMode('review')}>
                    <ArrowLeft className="h-4 w-4 text-[hsl(var(--ui-text-muted))]" />
                </Button>
                <Button 
                    variant="ghost" 
                    className="flex-1 rounded-none h-full text-green-700"
                    onClick={handleLink}
                    disabled={!selectedPlaybook || submitting}
                >
                    <Check className="h-4 w-4 mr-2" /> Salvar Vínculo
                </Button>
            </CardFooter>
        </>
    );

    const renderCreateState = () => (
        <>
            <CardContent className="p-4 py-5 flex-1 flex flex-col gap-3">
                <div className="space-y-1">
                    <label className="text-xs font-semibold">Título do Playbook</label>
                    <input 
                        className="w-full h-8 rounded-md border border-[hsl(var(--ui-border))] text-sm px-2 text-[hsl(var(--ui-text))]"
                        value={createName}
                        onChange={(e) => setCreateName(e.target.value)}
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-semibold">Resposta do Frank</label>
                    <textarea 
                        className="w-full h-24 rounded-md border border-[hsl(var(--ui-border))] text-sm p-2 text-[hsl(var(--ui-text))] resize-none"
                        value={createResponse}
                        onChange={(e) => setCreateResponse(e.target.value)}
                    />
                </div>
                <p className="text-[10px] text-[hsl(var(--ui-text-muted))]">
                    As entidades e a frase mapeada serão anexadas automaticamente.
                </p>
            </CardContent>
            <CardFooter className="p-0 flex h-10 border-t border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))]">
                <Button variant="ghost" className="flex-none rounded-none h-full px-4 border-r border-[hsl(var(--ui-border))]" onClick={() => setViewMode('review')}>
                    <ArrowLeft className="h-4 w-4 text-[hsl(var(--ui-text-muted))]" />
                </Button>
                <Button 
                    variant="ghost" 
                    className="flex-1 rounded-none h-full text-purple-700"
                    onClick={handleCreate}
                    disabled={!createName || !createResponse || submitting}
                >
                    <Check className="h-4 w-4 mr-2" /> Criar Playbook
                </Button>
            </CardFooter>
        </>
    );

    return (
        <Card className="flex flex-col h-full hover:shadow-md transition-shadow relative overflow-hidden group border-[hsl(var(--ui-border))]">
            <CardHeader className="bg-[hsl(var(--ui-bg-subtle))] p-4 flex flex-row items-center justify-between space-y-0 h-16 flex-none">
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-[hsl(var(--ui-text-muted))] uppercase tracking-wider">
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

            {viewMode === 'review' && renderReviewState()}
            {viewMode === 'link' && renderLinkState()}
            {viewMode === 'create' && renderCreateState()}

        </Card>
    );
}
