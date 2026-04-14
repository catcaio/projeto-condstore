'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type FormState = 'idle' | 'loading' | 'success' | 'error';

interface FormValues {
    nome: string;
    empresa: string;
    cargo: string;
    canal: string;
    operacao: string;
    mensagem: string;
}

interface FormErrors {
    nome?: string;
    empresa?: string;
    cargo?: string;
    canal?: string;
    operacao?: string;
}

const INITIAL_VALUES: FormValues = {
    nome: '',
    empresa: '',
    cargo: '',
    canal: '',
    operacao: '',
    mensagem: '',
};

function validate(v: FormValues): FormErrors {
    const errors: FormErrors = {};
    if (!v.nome.trim() || v.nome.trim().length < 2)
        errors.nome = 'Informe seu nome completo.';
    if (!v.empresa.trim() || v.empresa.trim().length < 2)
        errors.empresa = 'Informe o nome da empresa.';
    if (!v.cargo.trim() || v.cargo.trim().length < 2)
        errors.cargo = 'Informe seu cargo ou contexto operacional.';
    if (!v.canal)
        errors.canal = 'Selecione um canal de contato.';
    if (!v.operacao)
        errors.operacao = 'Selecione o foco principal da operação.';
    return errors;
}

const inputBase = [
    'w-full rounded-xl border border-[hsl(var(--ui-border))]',
    'bg-[hsl(var(--ui-surface))] px-4 text-sm text-[hsl(var(--ui-text))]',
    'placeholder:text-[hsl(var(--ui-text-subtle))]',
    'transition-colors duration-150',
    'focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ui-accent-blue)/0.3)] focus:border-[hsl(var(--ui-accent-blue))]',
].join(' ');

const inputError = 'border-[hsl(var(--ui-danger))] focus:ring-[hsl(var(--ui-danger)/0.25)] focus:border-[hsl(var(--ui-danger))]';

function FieldError({ msg }: { msg?: string }) {
    if (!msg) return null;
    return (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-[hsl(var(--ui-danger))]" role="alert">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {msg}
        </p>
    );
}

export function ContatoForm() {
    const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
    const [errors, setErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [state, setState] = useState<FormState>('idle');

    const set = (field: keyof FormValues) => (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        setValues((prev) => ({ ...prev, [field]: e.target.value }));
        if (touched[field]) {
            setErrors((prev) => ({ ...prev, [field]: undefined }));
        }
    };

    const blur = (field: keyof FormValues) => () => {
        setTouched((prev) => ({ ...prev, [field]: true }));
        const partial = validate(values);
        setErrors((prev) => ({ ...prev, [field]: partial[field as keyof FormErrors] }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const allTouched = Object.fromEntries(
            Object.keys(values).map((k) => [k, true])
        );
        setTouched(allTouched);
        const newErrors = validate(values);
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;

        setState('loading');
        try {
            const res = await fetch('/api/contato', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });
            if (res.ok) {
                setState('success');
            } else {
                const data = await res.json().catch(() => ({}));
                if (data.errors) {
                    setErrors(data.errors as FormErrors);
                }
                setState('error');
            }
        } catch {
            setState('error');
        }
    };

    return (
        <AnimatePresence mode="wait">
            {state === 'success' ? (
                <motion.div
                    key="success"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-[hsl(var(--ui-success)/0.3)] bg-[hsl(var(--ui-success)/0.06)] p-10 text-center"
                >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--ui-success)/0.12)] mx-auto mb-5">
                        <CheckCircle2 className="h-7 w-7 text-[hsl(var(--ui-success))]" />
                    </div>
                    <h3 className="text-xl font-extrabold text-[hsl(var(--ui-text))] tracking-tight mb-2">
                        Recebemos seu contato.
                    </h3>
                    <p className="text-sm text-[hsl(var(--ui-text-muted))] leading-relaxed max-w-sm mx-auto">
                        Nossa equipe vai analisar o contexto da sua operação e entrar em contato
                        pelo canal escolhido em até <strong className="text-[hsl(var(--ui-text))]">1 dia útil</strong>.
                    </p>
                    <a
                        href="/como-funciona"
                        className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--ui-accent-blue))] hover:underline"
                    >
                        Ver como funciona
                        <ArrowRight className="h-4 w-4" />
                    </a>
                </motion.div>
            ) : (
                <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onSubmit={handleSubmit}
                    noValidate
                    aria-label="Formulário de contato"
                >
                    <div className="space-y-5">
                        {/* Nome */}
                        <div>
                            <label
                                htmlFor="nome"
                                className="mb-1.5 block text-sm font-semibold text-[hsl(var(--ui-text))]"
                            >
                                Nome <span className="text-[hsl(var(--ui-danger))]" aria-hidden="true">*</span>
                            </label>
                            <input
                                id="nome"
                                type="text"
                                autoComplete="name"
                                placeholder="Seu nome completo"
                                value={values.nome}
                                onChange={set('nome')}
                                onBlur={blur('nome')}
                                className={cn(inputBase, 'h-11', errors.nome && inputError)}
                                aria-describedby={errors.nome ? 'nome-error' : undefined}
                                aria-invalid={!!errors.nome}
                            />
                            <FieldError msg={errors.nome} />
                        </div>

                        {/* Empresa + Cargo */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                                <label
                                    htmlFor="empresa"
                                    className="mb-1.5 block text-sm font-semibold text-[hsl(var(--ui-text))]"
                                >
                                    Empresa <span className="text-[hsl(var(--ui-danger))]" aria-hidden="true">*</span>
                                </label>
                                <input
                                    id="empresa"
                                    type="text"
                                    autoComplete="organization"
                                    placeholder="Nome da empresa"
                                    value={values.empresa}
                                    onChange={set('empresa')}
                                    onBlur={blur('empresa')}
                                    className={cn(inputBase, 'h-11', errors.empresa && inputError)}
                                    aria-invalid={!!errors.empresa}
                                />
                                <FieldError msg={errors.empresa} />
                            </div>
                            <div>
                                <label
                                    htmlFor="cargo"
                                    className="mb-1.5 block text-sm font-semibold text-[hsl(var(--ui-text))]"
                                >
                                    Cargo <span className="text-[hsl(var(--ui-danger))]" aria-hidden="true">*</span>
                                </label>
                                <input
                                    id="cargo"
                                    type="text"
                                    autoComplete="organization-title"
                                    placeholder="Ex: Gerente de Logística, Sócio"
                                    value={values.cargo}
                                    onChange={set('cargo')}
                                    onBlur={blur('cargo')}
                                    className={cn(inputBase, 'h-11', errors.cargo && inputError)}
                                    aria-invalid={!!errors.cargo}
                                />
                                <FieldError msg={errors.cargo} />
                            </div>
                        </div>

                        {/* Canal + Foco */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                                <label
                                    htmlFor="canal"
                                    className="mb-1.5 block text-sm font-semibold text-[hsl(var(--ui-text))]"
                                >
                                    Canal preferido <span className="text-[hsl(var(--ui-danger))]" aria-hidden="true">*</span>
                                </label>
                                <select
                                    id="canal"
                                    value={values.canal}
                                    onChange={set('canal')}
                                    onBlur={blur('canal')}
                                    className={cn(
                                        inputBase, 'h-11 cursor-pointer',
                                        !values.canal && 'text-[hsl(var(--ui-text-subtle))]',
                                        errors.canal && inputError,
                                    )}
                                    aria-invalid={!!errors.canal}
                                >
                                    <option value="" disabled hidden>Selecionar</option>
                                    <option value="whatsapp">WhatsApp</option>
                                    <option value="email">E-mail</option>
                                    <option value="videochamada">Videochamada</option>
                                </select>
                                <FieldError msg={errors.canal} />
                            </div>
                            <div>
                                <label
                                    htmlFor="operacao"
                                    className="mb-1.5 block text-sm font-semibold text-[hsl(var(--ui-text))]"
                                >
                                    Foco principal <span className="text-[hsl(var(--ui-danger))]" aria-hidden="true">*</span>
                                </label>
                                <select
                                    id="operacao"
                                    value={values.operacao}
                                    onChange={set('operacao')}
                                    onBlur={blur('operacao')}
                                    className={cn(
                                        inputBase, 'h-11 cursor-pointer',
                                        !values.operacao && 'text-[hsl(var(--ui-text-subtle))]',
                                        errors.operacao && inputError,
                                    )}
                                    aria-invalid={!!errors.operacao}
                                >
                                    <option value="" disabled hidden>Selecionar</option>
                                    <option value="frete">Cotação e frete</option>
                                    <option value="atendimento">Atendimento B2B / CRM</option>
                                    <option value="pedidos">Gestão de pedidos</option>
                                    <option value="logistica">Rastreio e logística</option>
                                    <option value="outro">Outro</option>
                                </select>
                                <FieldError msg={errors.operacao} />
                            </div>
                        </div>

                        {/* Mensagem */}
                        <div>
                            <label
                                htmlFor="mensagem"
                                className="mb-1.5 block text-sm font-semibold text-[hsl(var(--ui-text))]"
                            >
                                Contexto da operação{' '}
                                <span className="font-normal text-[hsl(var(--ui-text-subtle))]">(opcional)</span>
                            </label>
                            <textarea
                                id="mensagem"
                                rows={3}
                                placeholder="Descreva brevemente sua operação ou principal dificuldade."
                                value={values.mensagem}
                                onChange={set('mensagem')}
                                className={cn(inputBase, 'py-3 resize-none leading-relaxed')}
                            />
                        </div>

                        {/* Error global */}
                        {state === 'error' && (
                            <motion.div
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-start gap-3 rounded-xl border border-[hsl(var(--ui-danger)/0.3)] bg-[hsl(var(--ui-danger)/0.06)] px-4 py-3"
                                role="alert"
                            >
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--ui-danger))]" />
                                <p className="text-sm text-[hsl(var(--ui-danger))]">
                                    Ocorreu um erro ao enviar. Verifique os campos e tente novamente.
                                </p>
                            </motion.div>
                        )}

                        {/* Submit */}
                        <div className="pt-1">
                            <button
                                type="submit"
                                disabled={state === 'loading'}
                                className={cn(
                                    'inline-flex h-12 w-full items-center justify-center gap-2 rounded-full',
                                    'bg-[hsl(var(--ui-accent-blue))] px-8 text-sm font-bold text-white',
                                    'shadow-md shadow-[hsl(var(--ui-accent-blue)/0.15)]',
                                    'transition-all duration-150',
                                    'hover:bg-[hsl(var(--ui-accent-blue-strong))] hover:shadow-lg',
                                    'focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ui-accent-blue)/0.5)] focus:ring-offset-2',
                                    'disabled:cursor-not-allowed disabled:opacity-60',
                                )}
                            >
                                {state === 'loading' ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                        Enviando…
                                    </>
                                ) : (
                                    <>
                                        Solicitar demonstração
                                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                                    </>
                                )}
                            </button>
                            <p className="mt-3 text-center text-xs text-[hsl(var(--ui-text-subtle))]">
                                Sem spam. Resposta em até 1 dia útil.
                            </p>
                        </div>
                    </div>
                </motion.form>
            )}
        </AnimatePresence>
    );
}
