import { requireSession } from '@/infra/auth/guards';
import { playbookService } from '@/modules/playbooks/playbook.service';
import { GovernanceShell } from '@/modules/governance/components/governance-shell';
import Link from 'next/link';
import { Plus, BookOpen, Clock, Play } from 'lucide-react';
import { Button } from '@/ui/components/button';

export default async function PlaybooksListPage() {
    const sessionRes = await requireSession(undefined as any);
    if (!sessionRes.ok) return null;
    const ctx = sessionRes.session as any;
    const playbooks = await playbookService.listPlaybooks(ctx.tenantId);

    return (
        <GovernanceShell title="Knowledge & Playbooks">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">Operational Playbooks</h1>
                    <p className="text-neutral-500 dark:text-neutral-400 mt-1">Automate responses to recurring incidents.</p>
                </div>
                <Link href="/cockpit/playbooks/new">
                    <Button variant="secondary">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Playbook
                    </Button>
                </Link>
            </div>

            {playbooks.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-center">
                    <BookOpen className="w-12 h-12 text-neutral-300 dark:text-neutral-700 mb-4" />
                    <h3 className="text-lg font-medium text-neutral-900 dark:text-white">No playbooks found</h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 max-w-sm">
                        Create standardized procedures to react to critical incidents and eliminate repetitive triage logic.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {playbooks.map((pb) => (
                        <Link key={pb.id} href={`/cockpit/playbooks/${pb.id}`}>
                            <div className="group block p-5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl hover:border-brand-primary dark:hover:border-brand-primary transition shadow-sm hover:shadow-md h-full flex flex-col">
                                <h3 className="font-semibold text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 text-brand-primary" />
                                    {pb.title}
                                </h3>
                                
                                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2 line-clamp-2 mt-auto">
                                    {pb.description || 'No description provided.'}
                                </p>
                                
                                <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
                                    <span className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-md">
                                        <Play className="w-3.5 h-3.5" />
                                        {pb.steps.length} steps
                                    </span>
                                    {pb.triggerType && (
                                        <span className="px-2 py-1 bg-amber-50 dark:bg-amber-500/10 text-brand-primary rounded-md font-medium border border-amber-200 dark:border-brand-primary/20">
                                            Trigger: {pb.triggerType}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </GovernanceShell>
    );
}
