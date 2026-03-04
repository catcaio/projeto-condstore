'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, Mail, Truck } from 'lucide-react';
import { trackEvent } from '@/ui/lib/track-client';
import { safeFetch } from '@/ui/lib/safe-fetch';
import { Badge, Button, Card, CardContent, CardHeader, TextField } from '@/ui/components';
import { ThemeToggle } from '@/ui/theme';
import Link from 'next/link';

interface LoginFormProps {
    buildLabel: string;
    googleEnabled?: boolean;
}

function GoogleIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.44 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
    );
}

<<<<<<< HEAD
export function LoginForm({ buildLabel, googleEnabled = false }: LoginFormProps) {
=======
export function LoginForm({ buildLabel }: LoginFormProps) {
>>>>>>> origin/main
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [entryData, setEntryData] = useState<string | null>(null);

    useEffect(() => {
        const match = document.cookie.match(/(?:^|; )condstore_entry=([^;]*)/);
        if (match && match[1]) {
            setEntryData(match[1]);
            const [src, el] = match[1].split(':');
            trackEvent({
                type: 'entry_start',
                page: 'auth',
                section: 'login',
                metadata: { src, element: el }
            });
        }
    }, []);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await safeFetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const text = await res.text();
            let data: any = null;
            try { data = JSON.parse(text); } catch { }

            if (!res.ok || !data?.success) {
                if (data?.error) {
                    setError(data.error);
                } else {
                    const reqId = res.headers.get('x-request-id') || 'desconhecido';
                    setError(`Falha no servidor (não-JSON) Status ${res.status}. ID: ${reqId}`);
                }
                return;
            }

            if (entryData) {
                const [src, el] = entryData.split(':');
                trackEvent({
                    type: 'entry_success',
                    page: 'auth',
                    section: 'login',
                    metadata: { src, element: el }
                });
            }

            window.location.href = '/home';
        } catch {
            setError('Erro de conexão. Tente novamente.');
        } finally {
            setLoading(false);
        }
    }

    function handleGoogleLogin() {
        setGoogleLoading(true);
        window.location.href = '/api/auth/google';
    }

    return (
        <div className="min-h-screen px-4 py-8 sm:px-6">
            <div className="mx-auto flex w-full max-w-md flex-col gap-4 pt-6 sm:pt-12">
                <div className="flex justify-end">
                    <ThemeToggle />
                </div>

                <Card variant="elevated" className="overflow-hidden">
                    <CardHeader
                        className="pb-2"
                        heading={
                            <div className="flex items-center gap-3">
                                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[hsl(var(--ui-accent-blue)/0.12)] text-[hsl(var(--ui-accent-blue))]">
                                    <Truck className="h-5 w-5" />
                                </span>
                                <div>
                                    <h1 className="text-xl font-semibold tracking-tight text-[hsl(var(--ui-text))]">
                                        CondStore OS
                                    </h1>
                                    <p className="text-xs font-normal text-[hsl(var(--ui-text-muted))]">
                                        Painel logístico
                                    </p>
                                </div>
                            </div>
                        }
                        actions={<Badge variant="outline">FRONT-01</Badge>}
                    />
                    <CardContent className="space-y-4">
                        <div className="rounded-xl bg-[hsl(var(--ui-muted))] px-3 py-2">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-[hsl(var(--ui-text-muted))]">
                                Build
                            </p>
                            <p className="mt-0.5 text-xs text-[hsl(var(--ui-text))]" data-testid="login-build-label">
                                {buildLabel}
                            </p>
                        </div>

<<<<<<< HEAD
                        {/* Google Login (only shown when configured) */}
                        {googleEnabled && (
                            <>
                                <Button
                                    type="button"
                                    onClick={handleGoogleLogin}
                                    disabled={googleLoading}
                                    className="w-full"
                                    size="lg"
                                    variant="secondary"
                                    id="google-login-btn"
                                >
                                    <GoogleIcon className="mr-2 h-5 w-5" />
                                    {googleLoading ? 'Redirecionando...' : 'Entrar com Google'}
                                </Button>

                                {/* Divider */}
                                <div className="flex items-center gap-3">
                                    <div className="h-px flex-1 bg-[hsl(var(--ui-border))]" />
                                    <span className="text-xs font-medium text-[hsl(var(--ui-text-muted))]">ou</span>
                                    <div className="h-px flex-1 bg-[hsl(var(--ui-border))]" />
                                </div>
                            </>
                        )}
=======
                        {/* Google Login */}
                        <Button
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={googleLoading}
                            className="w-full"
                            size="lg"
                            variant="secondary"
                            id="google-login-btn"
                        >
                            <GoogleIcon className="mr-2 h-5 w-5" />
                            {googleLoading ? 'Redirecionando...' : 'Entrar com Google'}
                        </Button>

                        {/* Divider */}
                        <div className="flex items-center gap-3">
                            <div className="h-px flex-1 bg-[hsl(var(--ui-border))]" />
                            <span className="text-xs font-medium text-[hsl(var(--ui-text-muted))]">ou</span>
                            <div className="h-px flex-1 bg-[hsl(var(--ui-border))]" />
                        </div>
>>>>>>> origin/main

                        {/* Email/Password Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <TextField
                                id="email"
                                label="Email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                                placeholder="admin@condstore.local"
                            />

                            <TextField
                                id="password"
                                label="Senha"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                                placeholder="••••••••"
                            />

                            {error ? (
                                <div className="flex items-start gap-2 rounded-xl border border-[hsl(var(--ui-danger)/0.2)] bg-[hsl(var(--ui-danger)/0.08)] px-3 py-2.5 text-sm text-[hsl(var(--ui-danger-ink))]">
                                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            ) : null}

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full"
                                size="lg"
                            >
                                <Mail className="mr-2 h-4 w-4" />
                                {loading ? 'Entrando...' : 'Entrar com Email'}
                            </Button>
                        </form>

                        {/* Signup link */}
                        <div className="text-center">
                            <Link
                                href="/signup"
                                className="text-sm font-medium text-[hsl(var(--ui-accent-blue))] hover:underline"
                                id="signup-link"
                            >
                                Criar conta
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
