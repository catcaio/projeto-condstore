'use client';

import { useState } from 'react';

export function PrivacyControlsClient({ tenantId }: { tenantId: string }) {
    const [loading, setLoading] = useState(false);
    const [phoneHash, setPhoneHash] = useState('');
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

    async function handleAction(action: 'revoke' | 'purge' | 'export') {
        if (!phoneHash.trim()) {
            setFeedback({ type: 'error', msg: 'Informe o hash do telefone para esta ação.' });
            return;
        }

        if (action === 'purge' && !confirm('ATENÇÃO: Este comando força a remoção de todos os dados vetoriais, logs e chaves de retenção associados à esta identidade. Deseja prosseguir de forma irreversível?')) {
            return;
        }

        setLoading(true);
        setFeedback(null);

        try {
            const endpoint = `/api/tenants/${tenantId}/privacy/${action}`;

            const reqInit: RequestInit = {
                method: action === 'export' ? 'GET' : 'POST',
                headers: { 'Content-Type': 'application/json' },
            };

            if (action !== 'export') {
                reqInit.body = JSON.stringify({ phoneHash });
            } else {
                reqInit.method = 'POST'; // We'll force export to POST to securely pass the hash in body
                reqInit.body = JSON.stringify({ phoneHash });
            }

            const res = await fetch(endpoint, reqInit);

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Erro processando requisição');
            }

            if (action === 'export') {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `privacy_export_${phoneHash.substring(0, 8)}.json`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                setFeedback({ type: 'success', msg: 'Documento gerado e baixado.' });
            } else {
                setFeedback({ type: 'success', msg: `Ação '${action}' executada com sucesso.` });
            }

        } catch (e: any) {
            setFeedback({ type: 'error', msg: e.message });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="p-6 bg-white rounded-xl shadow border border-gray-100 mt-8">
            <h3 className="text-lg font-semibold border-b pb-4 mb-4">Controles Manuais de Operação</h3>
            <p className="text-sm text-gray-500 mb-6">
                Ações de LGPD forçadas via Admin. Estas ações disparam tráfego irreversível nos datastores e RAGs logando purges permanentes.
            </p>

            <div className="flex flex-col gap-4 max-w-md">
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Target Phone Hash (Identity)</label>
                    <input
                        type="text"
                        className="w-full text-sm font-mono p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Ex: a4f8b9ec..."
                        value={phoneHash}
                        onChange={e => setPhoneHash(e.target.value)}
                    />
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => handleAction('export')}
                        disabled={loading}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded disabled:opacity-50"
                    >
                        Export Profile
                    </button>
                    <button
                        onClick={() => handleAction('revoke')}
                        disabled={loading}
                        className="px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-semibold rounded disabled:opacity-50"
                    >
                        Force Revoke
                    </button>
                    <button
                        onClick={() => handleAction('purge')}
                        disabled={loading}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded disabled:opacity-50"
                    >
                        Hard Purge
                    </button>
                </div>

                {feedback && (
                    <div className={`mt-2 p-3 rounded text-sm ${feedback.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                        {feedback.msg}
                    </div>
                )}
            </div>
        </div>
    );
}
