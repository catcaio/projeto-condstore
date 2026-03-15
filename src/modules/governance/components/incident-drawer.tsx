'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/ui/components/button';
import { PlaybookWithSteps } from '@/modules/playbooks/playbook.types';

export function IncidentDrawer({ 
    incidentTask, 
    tenantId, 
    currentUserId 
}: { 
    incidentTask: any, 
    tenantId: string, 
    currentUserId: string 
}) {
    const router = useRouter();
    const [suggestedPlaybooks, setSuggestedPlaybooks] = useState<PlaybookWithSteps[]>([]);
    const [loadingPlaybook, setLoadingPlaybook] = useState<string | null>(null);

    useEffect(() => {
        if (!incidentTask) return;
        
        // Fetch suggested playbooks hitting our server endpoint
        // For MVP, we pass the trigger (incidentTask.incidentSource or taskType)
        fetch(`/api/cockpit/governance/playbooks?triggerType=${encodeURIComponent(incidentTask.incidentSource || 'general')}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setSuggestedPlaybooks(data);
                }
            })
            .catch(console.error);
    }, [incidentTask]);

    const applyPlaybook = async (playbookId: string) => {
        setLoadingPlaybook(playbookId);
        try {
            const res = await fetch(`/api/cockpit/governance/playbooks/${playbookId}/apply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenantId,
                    parentTaskId: incidentTask.id,
                    actorUserId: currentUserId
                })
            });

            if (!res.ok) throw new Error('Failed to apply playbook');
            
            // Remove from suggestions (or keep as applied)
            setSuggestedPlaybooks(prev => prev.filter(p => p.id !== playbookId));
            router.refresh(); // Refresh to see new subtasks
        } catch (error) {
            console.error(error);
            alert('Failed to apply playbook');
        } finally {
            setLoadingPlaybook(null);
        }
    };

    const ignorePlaybook = (playbookId: string) => {
        setSuggestedPlaybooks(prev => prev.filter(p => p.id !== playbookId));
    };

    if (!incidentTask) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-96 bg-neutral-50 dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 shadow-xl p-6 overflow-y-auto">
            <h2 className="text-xl font-bold mb-2">{incidentTask.title}</h2>
            <p className="text-sm text-neutral-500 mb-6">{incidentTask.description}</p>

            {suggestedPlaybooks.length > 0 && (
                <div className="mb-8 space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">Suggested Playbooks</h3>
                    {suggestedPlaybooks.map(pb => (
                        <div key={pb.id} className="p-4 bg-brand-primary/5 border border-brand-primary/20 rounded-lg">
                            <h4 className="font-semibold text-brand-primary mb-1">{pb.title}</h4>
                            <p className="text-xs text-neutral-600 dark:text-neutral-300 mb-3">{pb.description}</p>
                            
                            <div className="flex items-center gap-2">
                                <Button 
                                    size="sm" 
                                    onClick={() => applyPlaybook(pb.id)}
                                    disabled={loadingPlaybook === pb.id}
                                >
                                    {loadingPlaybook === pb.id ? 'Applying...' : 'Apply Playbook'}
                                </Button>
                                <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    onClick={() => ignorePlaybook(pb.id)}
                                >
                                    Ignore
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Subtasks area, etc. */}
        </div>
    );
}
