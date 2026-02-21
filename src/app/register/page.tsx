"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (res.ok) {
                router.push('/billing');
            } else {
                const data = await res.json();
                setError(data.error || 'Erro ao registrar.');
            }
        } catch (err) {
            setError('Erro de rede.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--surface-base)] flex items-center justify-center p-4">
            <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-4 p-6 bg-white rounded-lg shadow-sm border border-gray-100">
                <h1 className="text-xl font-bold text-center text-[var(--brand-black)] mb-2">Criar Conta</h1>

                {error && (
                    <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">
                        {error}
                    </p>
                )}

                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Seu e-mail"
                    className="p-3 rounded border border-gray-300 w-full focus:outline-none focus:ring-2 focus:ring-black"
                    required
                />

                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha (mínimo 6 caracteres)"
                    className="p-3 rounded border border-gray-300 w-full focus:outline-none focus:ring-2 focus:ring-black"
                    required
                    minLength={6}
                />

                <button
                    type="submit"
                    disabled={loading}
                    className="bg-black text-white p-3 rounded font-semibold transition-opacity disabled:opacity-50 h-[56px] flex items-center justify-center"
                >
                    {loading ? (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        'Cadastrar'
                    )}
                </button>

                <p className="text-center text-sm text-gray-500 mt-2">
                    Já tem uma conta? <a href="/login" className="text-black font-semibold hover:underline">Faça login</a>
                </p>
            </form>
        </div>
    );
}
