'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/ui/components/card';
import { Button } from '@/ui/components/button';
import { CustomFieldEntity, CustomFieldDefinition } from '@/modules/custom-fields/custom-fields.types';

export function CustomFieldEditor() {
    const [entity, setEntity] = useState<CustomFieldEntity>('customer');
    const [fields, setFields] = useState<CustomFieldDefinition[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Form State
    const [fieldKey, setFieldKey] = useState('');
    const [label, setLabel] = useState('');
    const [type, setType] = useState<'text' | 'number' | 'select' | 'boolean' | 'date' | 'textarea'>('text');
    const [optionsStr, setOptionsStr] = useState('');
    const [required, setRequired] = useState(false);
    const [saving, setSaving] = useState(false);

    const loadFields = async (ent: CustomFieldEntity) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/cockpit/custom-fields?entity=${ent}`);
            const { data } = await res.json();
            if (data) setFields(data);
        } catch (e) {
            alert('Erro ao carregar campos customizados');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFields(entity);
    }, [entity]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const options = type === 'select' ? optionsStr.split(',').map(s => s.trim()).filter(Boolean) : undefined;
            const res = await fetch('/api/cockpit/custom-fields', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entity, fieldKey, label, type, required, options })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error?.message || 'Erro ao criar');
            }
            alert('Campo criado com sucesso!');
            setFieldKey('');
            setLabel('');
            setOptionsStr('');
            setRequired(false);
            loadFields(entity);
        } catch (e: any) {
            alert(e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Deseja realmente remover este campo?')) return;
        try {
            const res = await fetch(`/api/cockpit/custom-fields/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Erro ao deletar');
            setFields(fields.filter(f => f.id !== id));
            alert('Deletado');
        } catch (e) {
            alert('Erro ao deletar');
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <Card>
                    <CardHeader>
                        <h2 className="text-lg font-semibold">Novo Campo Dinâmico</h2>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Entidade</label>
                                <select 
                                    value={entity} 
                                    onChange={(e: any) => setEntity(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                    <option value="customer">Customer (Cliente)</option>
                                    <option value="conversation">Conversation (Conversa)</option>
                                    <option value="order">Order (Pedido)</option>
                                    <option value="shipment">Shipment (Envio)</option>
                                    <option value="pipeline">Pipeline (Oportunidade)</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Key (A-Z, 0-9, _)</label>
                                    <input required value={fieldKey} onChange={(e: any) => setFieldKey(e.target.value)} placeholder="ex: doc_number" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Label</label>
                                    <input required value={label} onChange={(e: any) => setLabel(e.target.value)} placeholder="ex: Número do Documento" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Tipo</label>
                                    <select value={type} onChange={(e: any) => setType(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                        <option value="text">Texto Curto</option>
                                        <option value="number">Número</option>
                                        <option value="select">Lista (Select)</option>
                                        <option value="boolean">Checkbox (Sim/Não)</option>
                                        <option value="date">Data</option>
                                        <option value="textarea">Texto Longo</option>
                                    </select>
                                </div>
                                <div className="flex items-center pt-6">
                                    <input type="checkbox" id="req" checked={required} onChange={(e: any) => setRequired(e.target.checked)} className="mr-2" />
                                    <label htmlFor="req" className="text-sm">Obrigatório</label>
                                </div>
                            </div>
                            {type === 'select' && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">Opções (separadas por vírgula)</label>
                                    <input required value={optionsStr} onChange={(e: any) => setOptionsStr(e.target.value)} placeholder="ex: A, B, C" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                                </div>
                            )}
                            <Button type="submit" disabled={saving}>
                                {saving ? 'Cariando...' : 'Criar Campo'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
            
            <div>
                <h3 className="text-lg font-medium mb-4">Campos de: {entity}</h3>
                {loading ? <p>Carregando...</p> : (
                    fields.length === 0 ? (
                        <div className="bg-muted p-4 rounded-md border">
                            <h3 className="text-sm font-medium">Nenhum campo para esta entidade</h3>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {fields.map(f => (
                                <Card key={f.id}>
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <div>
                                            <h2 className="text-md font-medium">{f.label} <span className="text-xs text-muted-foreground ml-2">{f.fieldKey}</span></h2>
                                        </div>
                                        <Button variant="danger" size="sm" onClick={() => handleDelete(f.id)}>Remover</Button>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-sm text-muted-foreground flex gap-4">
                                            <span>Tipo: <b>{f.type}</b></span>
                                            {f.required && <span><b>Obrigatório</b></span>}
                                            {f.options && <span>Opções: {f.options.join(', ')}</span>}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
