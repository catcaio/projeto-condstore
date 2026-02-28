'use client';

import { useState } from 'react';
import { AlertCircle, LockKeyhole, Mail, ShieldCheck, Truck } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardHeader, ListGroup, ListItem, Separator, TextField } from '@/ui/components';
import { ThemeToggle } from '@/ui/theme';

interface LoginFormProps {
    buildLabel: string;
}

export function LoginForm({ buildLabel }: LoginFormProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                setError(data.error || 'Erro ao fazer login');
                return;
            }

            window.location.href = '/home';
        } catch {
            setError('Erro de conexão. Tente novamente.');
        } finally {
            setLoading(false);
        }
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
                                {loading ? 'Entrando...' : 'Entrar'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <ListGroup>
                    <ListItem leading={<ShieldCheck className="h-4 w-4" />}>
                        <div className="min-w-0">
                            <p className="font-medium">Ambiente protegido</p>
                            <p className="text-xs text-[hsl(var(--ui-text-muted))]">
                                Sessão HTTP-only + invalidação server-side no logout
                            </p>
                        </div>
                    </ListItem>
                    <Separator />
                    <ListItem leading={<Mail className="h-4 w-4" />}>
                        <div className="min-w-0">
                            <p className="font-medium">Acesso de staging</p>
                            <p className="text-xs text-[hsl(var(--ui-text-muted))]">
                                Admin pode ser resetado via rota interna protegida
                            </p>
                        </div>
                    </ListItem>
                    <Separator />
                    <ListItem leading={<LockKeyhole className="h-4 w-4" />}>
                        <div className="min-w-0">
                            <p className="font-medium">Rate limit & observabilidade</p>
                            <p className="text-xs text-[hsl(var(--ui-text-muted))]">
                                Login falha com mensagens genéricas e logs sem PII
                            </p>
                        </div>
                    </ListItem>
                </ListGroup>
            </div>
        </div>
    );
}
