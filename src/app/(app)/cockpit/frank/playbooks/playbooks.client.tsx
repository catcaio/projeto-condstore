'use client';

import { useState, useEffect } from 'react';
import { getPlaybooksAction, createPlaybookAction, updatePlaybookAction, archivePlaybookAction } from './actions';
import type { FrankPlaybookRecord } from '@/drizzle/schema';
import { FileText, Plus, Trash2, Edit2, Bot, X } from 'lucide-react';

const COMMON_INTENTS = [
    'SAUDACAO', 'FRETE', 'PRODUTO', 'PEDIDO', 'ORDER_STATUS', 'SHIPMENT_STATUS', 'COMPLAINT', 'CONFIRM_ORDER', 'OUTRO'
];

type FormData = {
    title: string;
    intent: string;
    responseBase: string;
    nextStepSuggestion: string;
    status: 'draft' | 'approved' | 'archived';
    priority: number;
    requiresHumanHandoff: boolean;
};

export function PlaybooksClient() {
    const [playbooks, setPlaybooks] = useState<FrankPlaybookRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<FormData>({
        title: '',
        intent: 'SAUDACAO',
        responseBase: '',
        nextStepSuggestion: '',
        status: 'draft',
        priority: 0,
        requiresHumanHandoff: false,
    });

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setIsLoading(true);
        try {
            const data = await getPlaybooksAction();
            setPlaybooks(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    function handleOpenCreate() {
        setEditingId(null);
        setFormData({
            title: '', intent: 'SAUDACAO', responseBase: '', nextStepSuggestion: '', status: 'draft', priority: 0, requiresHumanHandoff: false
        });
        setIsDialogOpen(true);
    }

    function handleOpenEdit(pb: FrankPlaybookRecord) {
        setEditingId(pb.id);
        const statusVal = pb.status as 'draft' | 'approved' | 'archived';
        setFormData({
            title: pb.title,
            intent: pb.intent,
            responseBase: pb.responseBase,
            nextStepSuggestion: pb.nextStepSuggestion ?? '',
            status: statusVal,
            priority: pb.priority,
            requiresHumanHandoff: pb.requiresHumanHandoff,
        });
        setIsDialogOpen(true);
    }

    async function handleSave() {
        if (!formData.title || !formData.responseBase) return;
        
        try {
            if (editingId) {
                await updatePlaybookAction({ id: editingId, ...formData });
            } else {
                await createPlaybookAction(formData);
            }
            setIsDialogOpen(false);
            loadData();
        } catch (err) {
            console.error('Failed to save', err);
        }
    }

    async function handleArchive(id: string) {
        if (!confirm('Arquivar este playbook? Ele não será mais usado pelo Frank.')) return;
        await archivePlaybookAction(id);
        loadData();
    }

    return (
        <div className="space-y-6 text-slate-900">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Frank Playbooks</h2>
                    <p className="text-slate-500">Base interna de conhecimento operável para guiar respostas do Frank.</p>
                </div>
                <button 
                    onClick={handleOpenCreate} 
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2"
                >
                    <Plus className="h-4 w-4 mr-2" /> Novo Playbook
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
            ) : playbooks.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-lg bg-slate-50">
                    <Bot className="h-12 w-12 text-slate-300 mb-4" />
                    <h3 className="text-lg font-medium">Nenhum playbook encontrado</h3>
                    <p className="text-sm text-slate-500 text-center max-w-sm mt-1">Crie playbooks para padronizar respostas do Frank para intenções específicas.</p>
                </div>
            ) : (
                <div className="border rounded-md overflow-hidden bg-white shadow-sm">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-100 text-slate-600 font-semibold text-xs uppercase">
                            <tr>
                                <th className="px-4 py-3 border-b">Título / Intent</th>
                                <th className="px-4 py-3 border-b">Status</th>
                                <th className="px-4 py-3 border-b text-center">Handoff</th>
                                <th className="px-4 py-3 border-b text-center">Prioridade</th>
                                <th className="px-4 py-3 border-b text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {playbooks.map(pb => (
                                <tr key={pb.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3">
                                        <div className="font-medium">{pb.title}</div>
                                        <div className="text-xs text-slate-500 mt-1 inline-block bg-slate-100 px-2 py-0.5 rounded border">
                                            {pb.intent}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-[11px] px-2 py-0.5 rounded font-medium border ${pb.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' : pb.status === 'archived' ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                                            {pb.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {pb.requiresHumanHandoff && <span className="text-[10px] px-2 py-0.5 rounded bg-red-100 text-red-700 font-semibold">SIM</span>}
                                    </td>
                                    <td className="px-4 py-3 text-center text-slate-500 font-mono">
                                        {pb.priority}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => handleOpenEdit(pb)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                        {pb.status !== 'archived' && (
                                            <button onClick={() => handleArchive(pb.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {isDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                        <div className="flex ITEMS-center justify-between p-4 border-b">
                            <h2 className="text-lg font-semibold">{editingId ? 'Editar Playbook' : 'Criar Playbook'}</h2>
                            <button onClick={() => setIsDialogOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto space-y-4 text-sm flex-1">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="font-medium">Título Interno</label>
                                    <input 
                                        type="text"
                                        className="w-full h-10 px-3 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.title} 
                                        onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} 
                                        placeholder="Ex: Atraso Transportadora" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="font-medium">Intenção Associada</label>
                                    <select 
                                        className="w-full h-10 px-3 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                        value={formData.intent} 
                                        onChange={e => setFormData(p => ({ ...p, intent: e.target.value }))}
                                    >
                                        {COMMON_INTENTS.map(i => <option key={i} value={i}>{i}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="font-medium">Base de Resposta do Frank</label>
                                <textarea 
                                    className="w-full px-3 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                                    value={formData.responseBase} 
                                    onChange={e => setFormData(p => ({ ...p, responseBase: e.target.value }))}
                                    placeholder="A resposta que o Frank usará como base para formar a mensagem..."
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="font-medium">Sugestão Próximo Passo ("E Agora?")</label>
                                <input 
                                    type="text"
                                    className="w-full h-10 px-3 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.nextStepSuggestion} 
                                    onChange={e => setFormData(p => ({ ...p, nextStepSuggestion: e.target.value }))}
                                    placeholder="Ex: Posso abrir um chamado se preferir."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="space-y-1.5">
                                    <label className="font-medium">Status</label>
                                    <select 
                                        className="w-full h-10 px-3 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                        value={formData.status} 
                                        onChange={e => setFormData(p => ({ ...p, status: e.target.value as 'draft'|'approved'|'archived' }))}
                                    >
                                        <option value="draft">Rascunho</option>
                                        <option value="approved">Aprovado (Ativo)</option>
                                        <option value="archived">Arquivado</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="font-medium">Prioridade (Maior = primeiro)</label>
                                    <input 
                                        type="number" 
                                        className="w-full h-10 px-3 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.priority} 
                                        onChange={e => setFormData(p => ({ ...p, priority: Number(e.target.value) }))} 
                                    />
                                </div>
                            </div>

                            <div className="flex items-center space-x-2 pt-4 border-t mt-4">
                                <input 
                                    type="checkbox"
                                    id="handoff"
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                                    checked={formData.requiresHumanHandoff} 
                                    onChange={e => setFormData(p => ({ ...p, requiresHumanHandoff: e.target.checked }))} 
                                />
                                <label htmlFor="handoff" className="font-normal text-sm text-slate-700 select-none">
                                    Forçar Envio Humano (SUPERVISED mode) logo após preparar essa resposta
                                </label>
                            </div>
                        </div>

                        <div className="flex items-center justify-end p-4 border-t gap-3 bg-slate-50 rounded-b-lg">
                            <button onClick={() => setIsDialogOpen(false)} className="px-4 py-2 border rounded-md text-slate-700 bg-white hover:bg-slate-50 font-medium">Cancelar</button>
                            <button onClick={handleSave} disabled={!formData.title || !formData.responseBase} className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">Salvar Playbook</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
