'use client';

import { useState, useEffect, useCallback } from 'react';

interface Suggestion {
    id: string;
    sessionId: string;
    suggestedResponse: string;
    confidence: string;
    source: string;
    approved: boolean;
    createdAt: string;
}

export function SuggestionPanel() {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchSuggestions = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/cockpit/frank/suggestions');
            const json = await res.json();
            if (json.ok) setSuggestions(json.data);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSuggestions();
    }, [fetchSuggestions]);

    const handleApprove = async (id: string) => {
        const res = await fetch(`/api/cockpit/frank/suggestions/${id}/approve`, { method: 'POST' });
        const json = await res.json();
        if (json.ok) {
            setSuggestions((prev) => prev.filter((s) => s.id !== id));
        }
    };

    return (
        <div className="frank-suggestion-panel">
            <div className="frank-suggestion-header">
                <h2>💡 Sugestões Pendentes</h2>
                <button
                    id="suggestion-refresh-btn"
                    className="frank-btn frank-btn-secondary"
                    onClick={fetchSuggestions}
                    disabled={loading}
                >
                    Atualizar
                </button>
            </div>

            {loading && <p className="frank-loading">Carregando...</p>}

            <div className="frank-suggestion-list">
                {suggestions.map((s) => (
                    <div key={s.id} className="frank-suggestion-card" id={`suggestion-${s.id}`}>
                        <div className="frank-suggestion-meta">
                            <span className="frank-suggestion-session">Sessão: {s.sessionId.slice(0, 12)}...</span>
                            <span className="frank-suggestion-source">{s.source}</span>
                            <span className="frank-suggestion-confidence">
                                Confiança: {(parseFloat(s.confidence) * 100).toFixed(0)}%
                            </span>
                        </div>
                        <p className="frank-suggestion-text">{s.suggestedResponse}</p>
                        <div className="frank-suggestion-actions">
                            <button
                                id={`approve-btn-${s.id}`}
                                className="frank-btn frank-btn-primary"
                                onClick={() => handleApprove(s.id)}
                            >
                                ✅ Aprovar
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {!loading && suggestions.length === 0 && (
                <p className="frank-empty">Nenhuma sugestão pendente.</p>
            )}
        </div>
    );
}
