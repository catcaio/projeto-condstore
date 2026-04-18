'use client';

import { useState } from 'react';
import { AlertCircle, ArrowLeft, Truck, UserPlus } from 'lucide-react';
import { safeFetch } from '@/ui/lib/safe-fetch';
import { Badge, Button, Card, CardContent, CardHeader, TextField } from '@/ui/components';
import { ThemeToggle } from '@/ui/theme';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const ROLE_OPTIONS = [
    { value: 'viewer', label: 'Cliente', description: 'Acesso básico ao painel' },
    { value: 'operator', label: 'Funcionário', description: 'Operações do dia a dia' },
    { value: 'manager', label: 'Gerente', description: 'Gestão e relatórios' },
    { value: 'admin', label: 'Administrador', description: 'Acesso total ao sistema' },
] as const;

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

// Roles that require an invite in normal flows (kept here for reference if needed, but UI is simplified)
// const PRIVILEGED_ROLES = new Set(['manager', 'admin']);

export function SignupForm() {
    const searchParams = useSearchParams();
    const googleProvider = searchParams.get('provider') === 'google';
    const prefillEmail = searchParams.get('email') || '';
    const prefillName = searchParams.get('name') || '';

    const [name, setName] = useState(prefillName);
    const [email, setEmail] = useState(prefillEmail);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState('admin');
    const [inviteToken, setInviteToken] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const isGoogleFlow = googleProvider;

    function handleGoogleSignup() {
        setGoogleLoading(true);
        window.location.href = '/api/auth/google';
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');

        if (!role) {
            setError('Selecione seu tipo de conta.');
            return;
        }

        if (!isGoogleFlow) {
            if (password.length < 8) {
                setError('A senha deve ter pelo menos 8 caracteres.');
                return;
            }
            if (password !== confirmPassword) {
                setError('As senhas não coincidem.');
                return;
            }
        }

        setLoading(true);

        try {
            const body: Record<string, string> = {
                name,
                email,
                roleRequested: role,
            };
            if (!isGoogleFlow) {
                body.password = password;
            }
            if (inviteToken) {
                body.inviteToken = inviteToken;
            }
            if (isGoogleFlow) {
                body.provider = 'google';
            }

            const res = await safeFetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await res.json().catch(() => null);
            const reqId = res.headers.get('x-request-id') || 'desconhecido';

            if (!res.ok || !data?.success) {
                if (!data) {
                    setError(`Falha no servidor (não-JSON) Status ${res.status}. ID: ${reqId}`);
                } else {
                    setError(data.error || `Erro ${res.status}`);
                }
                return;
            }

            setSuccess(true);

            if (data.emailVerifyRequired) {
                // Stay on page showing verify message
            } else {
                window.location.href = '/home';
            }
        } catch (err: any) {
            setError(`Erro de conexão: ${err.message}. Tente novamente.`);
        } finally {
            setLoading(false);
        }
    }

    if (success) {
        return (
            <div className="min-h-screen px-4 py-8 sm:px-6">
                <div className="mx-auto flex w-full max-w-md flex-col gap-4 pt-6 sm:pt-12">
                    <Card variant="elevated">
                        <CardContent className="space-y-4 py-8 text-center">
                            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[hsl(var(--ui-success)/0.12)]">
                                <UserPlus className="h-8 w-8 text-[hsl(var(--ui-success))]" />
                            </div>
                            <h2 className="text-lg font-semibold text-[hsl(var(--ui-text))]">
                                Conta criada!
                            </h2>
                            <p className="text-sm text-[hsl(var(--ui-text-muted))]">
                                Enviamos um link de verificação para <strong>{email}</strong>.
                                <br />
                                Verifique seu email para ativar a conta.
                            </p>
                            <Link href="/login">
                                <Button variant="secondary" className="mt-4">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Voltar ao login
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
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
                                        Criar conta
                                    </h1>
                                    <p className="text-xs font-normal text-[hsl(var(--ui-text-muted))]">
                                        {isGoogleFlow ? 'Complete seu cadastro' : 'Preencha seus dados'}
                                    </p>
                                </div>
                            </div>
                        }
                        actions={<Badge variant="outline">SIGNUP</Badge>}
                    />
                    <CardContent className="space-y-4">
                        {!isGoogleFlow && (
                            <>
                                <Button
                                    type="button"
                                    onClick={handleGoogleSignup}
                                    disabled={googleLoading}
                                    className="w-full"
                                    size="lg"
                                    variant="secondary"
                                    id="google-signup-btn"
                                >
                                    <GoogleIcon className="mr-2 h-5 w-5" />
                                    {googleLoading ? 'Redirecionando...' : 'Cadastrar com Google'}
                                </Button>

                                {/* Divider */}
                                <div className="flex items-center gap-3">
                                    <div className="h-px flex-1 bg-[hsl(var(--ui-border))]" />
                                    <span className="text-xs font-medium text-[hsl(var(--ui-text-muted))]">ou preencha os dados</span>
                                    <div className="h-px flex-1 bg-[hsl(var(--ui-border))]" />
                                </div>
                            </>
                        )}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <TextField
                                id="signup-name"
                                label="Nome completo"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                autoComplete="name"
                                placeholder="Seu nome"
                            />

                            <TextField
                                id="signup-email"
                                label="Email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                                placeholder="voce@empresa.com"
                                disabled={isGoogleFlow}
                            />

                            {!isGoogleFlow && (
                                <>
                                    <TextField
                                        id="signup-password"
                                        label="Senha"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        autoComplete="new-password"
                                        placeholder="Mínimo 8 caracteres"
                                    />
                                    <TextField
                                        id="signup-confirm-password"
                                        label="Confirmar senha"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        autoComplete="new-password"
                                        placeholder="Repita a senha"
                                    />
                                </>
                            )}

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
                                id="signup-submit-btn"
                            >
                                <UserPlus className="mr-2 h-4 w-4" />
                                {loading ? 'Criando conta...' : 'Criar conta'}
                            </Button>
                        </form>

                        <div className="text-center">
                            <Link
                                href="/login"
                                className="text-sm font-medium text-[hsl(var(--ui-accent-blue))] hover:underline"
                            >
                                <ArrowLeft className="mr-1 inline h-3 w-3" />
                                Já tenho conta
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
