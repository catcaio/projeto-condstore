'use client';

import { useState } from 'react';

interface KnowledgeEditorProps {
    initialData?: {
        id?: string;
        title: string;
        content: string;
        tags: string[];
        source: string;
    };
    onSave?: () => void;
}

export function KnowledgeEditor({ initialData, onSave }: KnowledgeEditorProps) {
    const [title, setTitle] = useState(initialData?.title ?? '');
    const [content, setContent] = useState(initialData?.content ?? '');
    const [tags, setTags] = useState(initialData?.tags?.join(', ') ?? '');
    const [source, setSource] = useState(initialData?.source ?? 'manual');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isEdit = !!initialData?.id;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSaving(true);

        try {
            const body = {
                title,
                content,
                tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
                source,
            };

            const url = isEdit
                ? `/api/cockpit/frank/knowledge/${initialData.id}`
                : '/api/cockpit/frank/knowledge';

            const res = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const json = await res.json();
            if (!json.ok) throw new Error(json.message ?? 'Failed to save');

            if (!isEdit) {
                setTitle('');
                setContent('');
                setTags('');
                setSource('manual');
            }

            onSave?.();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <form className="frank-knowledge-editor" onSubmit={handleSubmit}>
            <h3>{isEdit ? 'Editar Artigo' : 'Novo Artigo'}</h3>

            {error && <p className="frank-error">{error}</p>}

            <div className="frank-form-group">
                <label htmlFor="knowledge-title">Título</label>
                <input
                    id="knowledge-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder="Ex: Prazo de entrega São Paulo"
                />
            </div>

            <div className="frank-form-group">
                <label htmlFor="knowledge-content">Conteúdo</label>
                <textarea
                    id="knowledge-content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                    rows={6}
                    placeholder="Conteúdo do artigo que o Frank usará para responder..."
                />
            </div>

            <div className="frank-form-group">
                <label htmlFor="knowledge-tags">Tags (separadas por vírgula)</label>
                <input
                    id="knowledge-tags"
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="frete, prazo, entrega"
                />
            </div>

            <div className="frank-form-group">
                <label htmlFor="knowledge-source">Origem</label>
                <select
                    id="knowledge-source"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                >
                    <option value="manual">Manual</option>
                    <option value="import">Importado</option>
                    <option value="faq">FAQ</option>
                </select>
            </div>

            <button
                id="knowledge-save-btn"
                type="submit"
                className="frank-btn frank-btn-primary"
                disabled={saving}
            >
                {saving ? 'Salvando...' : isEdit ? 'Atualizar' : 'Criar'}
            </button>
        </form>
    );
}
