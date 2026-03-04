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

const PRIVILEGED_ROLES = new Set(['manager', 'admin']);

export function SignupForm() {
    const searchParams = useSearchParams();
    const googleProvider = searchParams.get('provider') === 'google';
    const prefillEmail = searchParams.get('email') || '';
    const prefillName = searchParams.get('name') || '';

    const [name, setName] = useState(prefillName);
    const [email, setEmail] = useState(prefillEmail);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState('');
    const [inviteToken, setInviteToken] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const needsInvite = PRIVILEGED_ROLES.has(role);
    const isGoogleFlow = googleProvider;

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

            if (!res.ok || !data?.success) {
                setError(data?.error || `Erro ${res.status}`);
                return;
            }

            setSuccess(true);

            if (data.emailVerifyRequired) {
                // Stay on page showing verify message
            } else {
                window.location.href = '/home';
            }
        } catch {
            setError('Erro de conexão. Tente novamente.');
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

                            {/* Role selector */}
                            <div>
                                <label className="mb-2 block text-sm font-medium text-[hsl(var(--ui-text))]">
                                    Você é:
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {ROLE_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setRole(opt.value)}
                                            id={`role-${opt.value}`}
                                            className={`rounded-xl border px-3 py-2.5 text-left transition-all ${role === opt.value
                                                ? 'border-[hsl(var(--ui-accent-blue))] bg-[hsl(var(--ui-accent-blue)/0.08)] ring-1 ring-[hsl(var(--ui-accent-blue)/0.3)]'
                                                : 'border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] hover:border-[hsl(var(--ui-accent-blue)/0.4)]'
                                                }`}
                                        >
                                            <p className="text-sm font-medium text-[hsl(var(--ui-text))]">
                                                {opt.label}
                                            </p>
                                            <p className="text-[11px] text-[hsl(var(--ui-text-muted))]">
                                                {opt.description}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Invite token for privileged roles */}
                            {needsInvite && (
                                <TextField
                                    id="signup-invite-token"
                                    label="Token de convite"
                                    type="text"
                                    value={inviteToken}
                                    onChange={(e) => setInviteToken(e.target.value)}
                                    required
                                    placeholder="Cole o token recebido por email"
                                />
                            )}

                            {error ? (
                                <div className="flex items-start gap-2 rounded-xl border border-[hsl(var(--ui-danger)/0.2)] bg-[hsl(var(--ui-danger)/0.08)] px-3 py-2.5 text-sm text-[hsl(var(--ui-danger-ink))]">
                                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            ) : null}

                            <Button
                                type="submit"
                                disabled={loading || !role}
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
