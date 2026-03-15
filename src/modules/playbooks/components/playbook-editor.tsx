'use client';

import { useState } from 'react';
import { Button } from '@/ui/components/button';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plus, GripVertical, Trash2 } from 'lucide-react';

export function PlaybookEditor({ initialData = null }: { initialData?: any }) {
    const router = useRouter();
    const [title, setTitle] = useState(initialData?.title || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [triggerType, setTriggerType] = useState(initialData?.triggerType || '');
    const [steps, setSteps] = useState<any[]>(initialData?.steps || [
        { id: '1', title: '', description: '', actionType: 'manual_task' }
    ]);
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/cockpit/governance/playbooks', {
                method: initialData ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: initialData?.id,
                    title,
                    description,
                    triggerType,
                    steps: steps.map((s, i) => ({ ...s, stepOrder: i }))
                })
            });

            if (!res.ok) throw new Error('Failed to save playbook');
            router.push('/cockpit/playbooks');
            router.refresh();
        } catch (error) {
            console.error(error);
            alert('Error saving playbook');
        } finally {
            setLoading(false);
        }
    };

    const addStep = () => {
        setSteps([...steps, { id: Math.random().toString(), title: '', description: '', actionType: 'manual_task' }]);
    };

    const removeStep = (index: number) => {
        setSteps(steps.filter((_, i) => i !== index));
    };

    const updateStep = (index: number, field: string, value: string) => {
        const newSteps = [...steps];
        newSteps[index][field] = value;
        setSteps(newSteps);
    };

    return (
        <div className="max-w-3xl mx-auto py-8">
            <div className="flex items-center justify-between mb-8">
                <Button variant="ghost" onClick={() => router.back()} className="gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button onClick={handleSave} disabled={loading || !title || steps.length === 0} className="gap-2">
                    <Save className="w-4 h-4" />
                    {loading ? 'Saving...' : 'Save Playbook'}
                </Button>
            </div>

            <div className="space-y-6">
                <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 space-y-4">
                    <input 
                        type="text" 
                        placeholder="Playbook Title (e.g. Carrier Delay Resolution)" 
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="w-full text-2xl font-bold bg-transparent border-0 border-b border-transparent hover:border-neutral-200 dark:hover:border-neutral-800 focus:border-brand-primary focus:ring-0 px-0 py-2 transition-colors placeholder:text-neutral-400"
                    />
                    
                    <textarea 
                        placeholder="Describe when and how to use this playbook..."
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className="w-full bg-transparent border border-neutral-200 dark:border-neutral-800 rounded-md p-3 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none resize-none h-24"
                    />

                    <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Trigger Matching (Optional)</label>
                        <input 
                            type="text" 
                            placeholder="e.g. logistics_sla_violation" 
                            value={triggerType}
                            onChange={e => setTriggerType(e.target.value)}
                            className="w-full md:w-1/2 bg-transparent border border-neutral-200 dark:border-neutral-800 rounded-md py-2 px-3 text-sm focus:border-brand-primary outline-none"
                        />
                        <p className="text-xs text-neutral-500 mt-1">If set, Frank will automatically suggest this playbook on matching incidents.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        Steps Sequence
                        <span className="bg-neutral-100 dark:bg-neutral-800 text-neutral-500 text-xs px-2 py-0.5 rounded-full">{steps.length}</span>
                    </h3>

                    {steps.map((step, index) => (
                        <div key={step.id} className="relative group flex gap-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 transition-all hover:border-brand-primary/50">
                            <div className="flex flex-col items-center justify-start py-2 text-neutral-400 cursor-grab active:cursor-grabbing">
                                <GripVertical className="w-5 h-5" />
                                <span className="mt-2 text-xs font-medium bg-neutral-100 dark:bg-neutral-800 rounded-full w-6 h-6 flex items-center justify-center">{index + 1}</span>
                            </div>
                            
                            <div className="flex-1 space-y-3">
                                <input 
                                    type="text" 
                                    placeholder="Step Action Title" 
                                    value={step.title}
                                    onChange={e => updateStep(index, 'title', e.target.value)}
                                    className="w-full font-medium bg-transparent border-0 border-b border-transparent hover:border-neutral-200 focus:border-brand-primary px-0 py-1 outline-none"
                                />
                                <textarea 
                                    placeholder="Instructions for the operator..."
                                    value={step.description}
                                    onChange={e => updateStep(index, 'description', e.target.value)}
                                    className="w-full text-sm bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/50 rounded-md p-2 outline-none h-16 resize-none focus:border-brand-primary"
                                />
                                
                                <select 
                                    value={step.actionType} 
                                    onChange={e => updateStep(index, 'actionType', e.target.value)}
                                    className="text-xs bg-neutral-100 dark:bg-neutral-800 border-0 rounded p-1 outline-none text-neutral-600 dark:text-neutral-300"
                                >
                                    <option value="manual_task">Manual Operator Task</option>
                                    <option value="investigation">Investigation & Analysis</option>
                                    <option value="communication">Customer Communication</option>
                                </select>
                            </div>

                            <button 
                                onClick={() => removeStep(index)}
                                className="absolute right-4 top-4 text-neutral-300 hover:text-status-error transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}

                    <Button variant="secondary" onClick={addStep} className="w-full border-dashed gap-2">
                        <Plus className="w-4 h-4" /> Add Step
                    </Button>
                </div>
            </div>
        </div>
    );
}
