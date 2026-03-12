'use client';

import { useState, useEffect, useCallback } from 'react';

interface KnowledgeEntry {
    id: string;
    title: string;
    content: string;
    tags: string[];
    source: string;
    createdAt: string;
    updatedAt: string;
}

export function KnowledgeList() {
    const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    const fetchEntries = useCallback(async () => {
        setLoading(true);
        try {
            const q = search ? `?q=${encodeURIComponent(search)}` : '';
            const res = await fetch(`/api/cockpit/frank/knowledge${q}`);
            const json = await res.json();
            if (json.ok) setEntries(json.data);
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        fetchEntries();
    }, [fetchEntries]);

    const handleDelete = async (id: string) => {
        if (!confirm('Remover este artigo da base de conhecimento?')) return;
        await fetch(`/api/cockpit/frank/knowledge/${id}`, { method: 'DELETE' });
        fetchEntries();
    };

    return (
        <div className="frank-knowledge-list">
            <div className="frank-knowledge-header">
                <h2>📚 Base de Conhecimento do Frank</h2>
                <div className="frank-knowledge-search">
                    <input
                        id="knowledge-search-input"
                        type="text"
                        placeholder="Buscar artigos..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {loading && <p className="frank-loading">Carregando...</p>}

            <div className="frank-knowledge-grid">
                {entries.map((entry) => (
                    <div key={entry.id} className="frank-knowledge-card" id={`knowledge-${entry.id}`}>
                        <div className="frank-knowledge-card-header">
                            <h3>{entry.title}</h3>
                            <span className="frank-knowledge-source">{entry.source}</span>
                        </div>
                        <p className="frank-knowledge-content">{entry.content.slice(0, 200)}...</p>
                        <div className="frank-knowledge-tags">
                            {(entry.tags ?? []).map((tag) => (
                                <span key={tag} className="frank-tag">{tag}</span>
                            ))}
                        </div>
                        <div className="frank-knowledge-actions">
                            <button
                                id={`knowledge-delete-${entry.id}`}
                                className="frank-btn frank-btn-danger"
                                onClick={() => handleDelete(entry.id)}
                            >
                                Remover
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {!loading && entries.length === 0 && (
                <p className="frank-empty">Nenhum artigo encontrado.</p>
            )}
        </div>
    );
}
