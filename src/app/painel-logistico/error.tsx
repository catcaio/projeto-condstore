'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-red-100 max-w-md w-full text-center">
                <div className="bg-red-50 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle size={32} className="text-red-600" />
                </div>

                <h2 className="text-xl font-bold text-slate-900 mb-2">
                    Ops! Algo deu errado.
                </h2>

                <p className="text-slate-500 mb-6">
                    Não foi possível carregar o painel logístico. Isso pode ter acontecido devido a um erro temporário ou dados corrompidos.
                </p>

                <div className="space-y-3">
                    <button
                        onClick={reset}
                        className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <RefreshCw size={18} />
                        Tentar Novamente
                    </button>

                    <button
                        onClick={() => {
                            localStorage.removeItem('painel_logistico_history');
                            window.location.reload();
                        }}
                        className="w-full bg-white text-slate-600 font-medium py-3 px-6 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                        Limpar Dados e Recarregar
                    </button>
                </div>
            </div>
        </div>
    );
}
