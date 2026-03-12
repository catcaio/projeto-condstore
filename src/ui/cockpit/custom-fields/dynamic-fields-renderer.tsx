'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/ui/components/card';
import { Button } from '@/ui/components/button';
import { CustomFieldEntity, CustomFieldDefinition, CustomFieldValue } from '@/modules/custom-fields/custom-fields.types';

export function DynamicFieldsRenderer({ 
    entity, 
    entityId, 
    onSaveSuccess 
}: { 
    entity: CustomFieldEntity, 
    entityId: string,
    onSaveSuccess?: () => void
}) {
    const [fields, setFields] = useState<CustomFieldDefinition[]>([]);
    const [values, setValues] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                // Fetch fields
                const resFields = await fetch(`/api/cockpit/custom-fields?entity=${entity}`);
                const { data: fieldsData } = await resFields.json();
                
                // Fetch existing values
                const resValues = await fetch(`/api/cockpit/custom-fields/values?entity=${entity}&entityId=${entityId}`);
                let valuesData = {};
                if (resValues.ok) {
                    const { data } = await resValues.json();
                    valuesData = data || {};
                }

                if (fieldsData) setFields(fieldsData);
                setValues(valuesData);
            } catch (e) {
                console.error('Failed to load dynamic fields', e);
            } finally {
                setLoading(false);
            }
        };

        if (entityId) load();
    }, [entity, entityId]);

    const handleChange = (fieldKey: string, val: string) => {
        setValues(prev => ({ ...prev, [fieldKey]: val }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payloadValues: CustomFieldValue[] = Object.entries(values).map(([k, v]) => ({
                fieldKey: k,
                value: v || null,
            }));

            const res = await fetch(`/api/cockpit/custom-fields/values`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entity, entityId, values: payloadValues })
            });
            if (!res.ok) throw new Error('Failed to save');
            alert('Valores salvos com sucesso!');
            if (onSaveSuccess) onSaveSuccess();
        } catch (e) {
            alert('Erro ao salvar campos');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="text-sm p-4 text-muted-foreground">Carregando campos...</div>;
    if (fields.length === 0) return null; // Não mostra nada se não tiver campos customizados

    return (
        <Card>
            <CardHeader className="py-3">
                <h3 className="text-md font-semibold">Campos Customizados</h3>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {fields.map(f => (
                        <div key={f.id}>
                            <label className="block text-sm font-medium mb-1">
                                {f.label} {f.required && <span className="text-red-500">*</span>}
                            </label>
                            
                            {f.type === 'text' && (
                                <input 
                                    type="text" 
                                    value={values[f.fieldKey] || ''} 
                                    onChange={(e) => handleChange(f.fieldKey, e.target.value)} 
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    required={f.required}
                                />
                            )}
                            
                            {f.type === 'number' && (
                                <input 
                                    type="number" 
                                    value={values[f.fieldKey] || ''} 
                                    onChange={(e) => handleChange(f.fieldKey, e.target.value)} 
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    required={f.required}
                                />
                            )}
                            
                            {f.type === 'date' && (
                                <input 
                                    type="date" 
                                    value={values[f.fieldKey] || ''} 
                                    onChange={(e) => handleChange(f.fieldKey, e.target.value)} 
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    required={f.required}
                                />
                            )}
                            
                            {f.type === 'boolean' && (
                                <div className="flex items-center h-10">
                                    <input 
                                        type="checkbox" 
                                        checked={values[f.fieldKey] === 'true'} 
                                        onChange={(e) => handleChange(f.fieldKey, e.target.checked ? 'true' : 'false')} 
                                        className="mr-2"
                                    />
                                    <span className="text-sm">Sim</span>
                                </div>
                            )}

                            {f.type === 'select' && f.options && (
                                <select 
                                    value={values[f.fieldKey] || ''} 
                                    onChange={(e) => handleChange(f.fieldKey, e.target.value)} 
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    required={f.required}
                                >
                                    <option value="">Selecione...</option>
                                    {f.options.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            )}

                            {f.type === 'textarea' && (
                                <textarea 
                                    value={values[f.fieldKey] || ''} 
                                    onChange={(e) => handleChange(f.fieldKey, e.target.value)} 
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    required={f.required}
                                />
                            )}
                        </div>
                    ))}
                    <Button onClick={handleSave} disabled={saving} className="w-full mt-2" size="sm">
                        {saving ? 'Salvando...' : 'Salvar Campos'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
