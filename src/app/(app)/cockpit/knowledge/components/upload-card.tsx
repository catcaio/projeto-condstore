'use client';

import { useState } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils'; // Optional if present, otherwise I will use template string

export function UploadCard({ tenantId, maxSizeBytes }: { tenantId: string; maxSizeBytes: number }) {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setStatus('idle');
            setMessage('');
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        if (file.size > maxSizeBytes) {
            setStatus('error');
            setMessage('Tamanho de arquivo excede limite do plano.');
            return;
        }

        setStatus('uploading');
        try {
            // 1. Init
            const initRes = await fetch('/api/knowledge/upload/init', {
                method: 'POST',
                body: JSON.stringify({
                    filename: file.name,
                    mimeType: file.type || 'application/octet-stream',
                    sizeBytes: file.size,
                })
            });

            if (!initRes.ok) {
                const errorData = await initRes.json();
                throw new Error(errorData.message || 'Falha ao iniciar upload');
            }

            const { uploadUrl, documentId, versionId } = await initRes.json();

            // 2. Upload to S3/R2 directly
            const uploadRes = await fetch(uploadUrl, {
                method: 'PUT',
                body: file,
                headers: {
                    'Content-Type': file.type || 'application/octet-stream',
                }
            });

            if (!uploadRes.ok) {
                throw new Error('Falha ao enviar arquivo');
            }

            // Pseudo-hash generation (MVP simply generates hash if on browser, or mock)
            const buffer = await file.arrayBuffer();
            const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const sha256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            setStatus('processing');

            // 3. Complete
            const compRes = await fetch('/api/knowledge/upload/complete', {
                method: 'POST',
                body: JSON.stringify({
                    documentId,
                    versionId,
                    sha256,
                })
            });

            if (!compRes.ok) {
                const errorData = await compRes.json();
                throw new Error(errorData.message || 'Falha ao concluir envio');
            }

            setStatus('success');
            setMessage('Documento enviado e enfileirado para processamento.');
            setFile(null); // reset UI for next upload

        } catch (error: any) {
            setStatus('error');
            setMessage(error.message);
        }
    };

    return (
        <div className="p-4 bg-[hsl(var(--ui-surface))] rounded-md border border-[hsl(var(--ui-border))]">
            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[hsl(var(--ui-border))] rounded-md bg-[hsl(var(--ui-page))] hover:bg-[hsl(var(--ui-surface))] transition-colors cursor-pointer relative"
                onClick={() => document.getElementById('knowledge-file-upload')?.click()}
            >
                <input
                    type="file"
                    id="knowledge-file-upload"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.txt,.csv,.md,.docx"
                />

                <UploadCloud className="w-10 h-10 text-[hsl(var(--ui-text-muted))] mb-2" />
                <p className="text-sm font-medium text-[hsl(var(--ui-text))]">
                    {file ? file.name : "Clique ou arraste um arquivo para envio"}
                </p>
                <p className="text-xs text-[hsl(var(--ui-text-muted))] mt-1">
                    PDF, TXT, CSV, MD (max {Math.round(maxSizeBytes / 1024 / 1024)}MB)
                </p>
            </div>

            {status !== 'idle' && (
                <div className={`mt-4 p-3 rounded-md text-sm flex gap-2 items-center ${status === 'error' ? 'bg-[hsl(var(--ui-danger)/0.1)] text-[hsl(var(--ui-danger-ink))]' :
                        status === 'success' ? 'bg-[hsl(var(--ui-success)/0.1)] text-[hsl(var(--ui-success-ink))]' :
                            'bg-[hsl(var(--ui-accent-blue)/0.1)] text-[hsl(var(--ui-accent-blue-ink))]'
                    }`}>
                    {status === 'error' && <AlertCircle className="w-4 h-4" />}
                    {status === 'success' && <CheckCircle2 className="w-4 h-4" />}
                    {(status === 'uploading' || status === 'processing') && <Loader2 className="w-4 h-4 animate-spin" />}

                    <span>
                        {status === 'uploading' ? 'Testando e enviando...' :
                            status === 'processing' ? 'Finalizando...' : message}
                    </span>
                </div>
            )}

            <div className="mt-4 flex justify-end">
                <button
                    disabled={!file || status === 'uploading' || status === 'processing'}
                    onClick={handleUpload}
                    className="px-4 py-2 bg-[hsl(var(--ui-accent-blue))] text-white text-sm font-medium rounded-md hover:bg-[hsl(var(--ui-accent-blue)/0.9)] disabled:opacity-50"
                >
                    Enviar Documento / Atualizar Versão
                </button>
            </div>
        </div>
    );
}
