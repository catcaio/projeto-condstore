'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/ui/components/card';
import { Button } from '@/ui/components/button';
import { ConfigCategory, GetConfigOutput } from '@/modules/config/config.types';

export function ConfigForm({ category, onSave }: { category: string, onSave: () => void }) {
    const [key, setKey] = useState('');
    const [value, setValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSuccessMsg('');
        setErrorMsg('');
        try {
            setIsLoading(true);
            const parsedValue = value.trim().startsWith('{') || value.trim().startsWith('[')
                ? JSON.parse(value)
                : value;

            const res = await fetch('/api/cockpit/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, value: parsedValue, category })
            });
            if (!res.ok) throw new Error('server');
            setSuccessMsg('Configuração salva com sucesso!');
            setKey('');
            setValue('');
            onSave();
        } catch (err: any) {
            setErrorMsg('Erro ao salvar configuração: Formato JSON inválido ou erro no servidor');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <h2 className="text-lg font-semibold leading-none tracking-tight">Nova Configuração</h2>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Chave (Key)</label>
                        <input value={key} onChange={(e: any) => setKey(e.target.value)} required placeholder="Ex: active_carriers ou stages" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Valor (JSON ou texto)</label>
                        <textarea
                            value={value}
                            onChange={(e: any) => setValue(e.target.value)}
                            className="w-full flex rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px]"
                            required
                        />
                    </div>
                    {successMsg && (
                        <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                            {successMsg}
                        </p>
                    )}
                    {errorMsg && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                            {errorMsg}
                        </p>
                    )}
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? 'Salvando...' : 'Salvar'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

export function ConfigList({ category, refreshTrigger }: { category: string, refreshTrigger: number }) {
    const [configs, setConfigs] = useState<GetConfigOutput[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [deleteError, setDeleteError] = useState('');

    useEffect(() => {
        const fetchConfigs = async () => {
            setLoadError('');
            try {
                const res = await fetch(`/api/cockpit/config?category=${category}`);
                const { data } = await res.json();
                if (data) setConfigs(data);
            } catch (err) {
                setLoadError('Erro ao carregar configurações. Tente novamente.');
            } finally {
                setLoading(false);
            }
        };
        fetchConfigs();
    }, [category, refreshTrigger]);

    const handleDelete = async (key: string) => {
        if (!confirm('Tem certeza que quer deletar esta configuração?')) return;
        setDeleteError('');
        try {
            const res = await fetch(`/api/cockpit/config/${key}?category=${category}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed');
            setConfigs(configs.filter(c => c.key !== key));
        } catch (e) {
            setDeleteError('Erro ao deletar configuração. Tente novamente.');
        }
    };

    if (loading) return <div>Carregando...</div>;
    if (loadError) return (
        <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2">
            <p className="text-sm text-red-600">{loadError}</p>
        </div>
    );
    if (configs.length === 0) return (
        <div className="bg-muted p-4 rounded-md border">
            <h3 className="text-sm font-medium">Nenhuma configuração encontrada</h3>
            <p className="text-sm text-muted-foreground">Crie uma nova configuração para esta categoria.</p>
        </div>
    );

    return (
        <div className="space-y-4 py-4">
            {deleteError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                    {deleteError}
                </p>
            )}
            {configs.map(c => (
                <Card key={c.id}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <h2 className="text-md font-medium">{c.key}</h2>
                        <Button variant="danger" size="sm" onClick={() => handleDelete(c.key)}>
                            Excluir
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <pre className="bg-muted p-2 rounded-md text-xs overflow-auto max-h-[200px]">
                            {JSON.stringify(c.value, null, 2)}
                        </pre>
                        <p className="text-xs text-muted-foreground mt-2">
                            Atualizado em: {new Date(c.updatedAt).toLocaleString()}
                        </p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

export function ConfigEditor({ category }: { category: string }) {
    const [refreshCount, setRefreshCount] = useState(0);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <ConfigForm category={category} onSave={() => setRefreshCount(c => c + 1)} />
            </div>
            <div>
                <h3 className="text-lg font-medium mb-4">Configurações Ativas</h3>
                <ConfigList category={category} refreshTrigger={refreshCount} />
            </div>
        </div>
    );
}
