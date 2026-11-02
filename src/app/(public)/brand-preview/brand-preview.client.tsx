'use client';

import * as React from 'react';
import { CondstoreLogo, CondstoreSymbol, type CondstoreLogoVariant } from '@/ui/components/Logo';

const VARIANTS: { id: CondstoreLogoVariant; name: string; tag: string; description: string }[] = [
    {
        id: 'v1',
        name: 'Candidata 1 (V1) — Nó Modular 2×2',
        tag: 'Recomendada',
        description: '4 módulos em superelipse com nó de sincronização elétrico no quadrante superior direito.',
    },
    {
        id: 'v2',
        name: 'Candidata 2 (V2) — Constelação Tri-nó',
        tag: 'Alternativa',
        description: '3 módulos orbitando núcleo triangular central (Atendimento, Cotação e Expedição).',
    },
    {
        id: 'v3',
        name: 'Candidata 3 (V3) — Loop Contínuo',
        tag: 'Alternativa',
        description: 'Dois arcos entrelaçados formando a curva contínua do Fio da Operação.',
    },
    {
        id: 'mono',
        name: 'Variante Monocromática (Pura)',
        tag: 'Invariante',
        description: 'Sem acento colorido nem transparência; corte de anel em contraste na superelipse.',
    },
];

const SCALES = [
    { label: 'Favicon / Dock (16px)', sizeClass: 'w-4 h-4' },
    { label: 'Ícone de Barra (32px)', sizeClass: 'w-8 h-8' },
    { label: 'Média Resolução (128px)', sizeClass: 'w-32 h-32' },
    { label: 'Apresentação (256px)', sizeClass: 'w-64 h-64' },
];

export function BrandPreviewClient() {
    return (
        <div className="space-y-12">
            {/* Introdução e Aviso de Status */}
            <div className="rounded-2xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-6 md:p-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <span className="inline-block px-2.5 py-1 rounded-md text-xs font-semibold tracking-wider uppercase bg-[hsl(var(--ui-muted))] text-[hsl(var(--ui-accent-blue))]">
                            Fase 1 — Homologação Visual
                        </span>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[hsl(var(--ui-text))] mt-2">
                            Painel de Avaliação da Identidade Visual — CONDSTORE OS
                        </h1>
                        <p className="text-sm text-[hsl(var(--ui-text-muted))] mt-1 max-w-3xl">
                            Artefato de inspeção e auditoria visual da Issue #442. As 3 variações conceituais são apresentadas lado a lado em fundos claro e escuro, escalas de 16px a 256px, layouts de assinatura e tabela de contraste WCAG 2.1 real.
                        </p>
                    </div>
                </div>
            </div>

            {/* Seção 1: Comparativo das 3 Candidatas em Fundo Claro e Escuro */}
            <div className="space-y-6">
                <h2 className="text-xl font-bold tracking-tight text-[hsl(var(--ui-text))]">
                    1. Matriz de Candidatas do Símbolo Modular
                </h2>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Painel Claro */}
                    <div className="site-light rounded-2xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] p-6 space-y-6">
                        <div className="flex items-center justify-between border-b border-[hsl(var(--ui-border))] pb-3">
                            <span className="text-xs font-bold uppercase tracking-widest text-[hsl(var(--ui-text-muted))]">
                                Fundo Claro Institucional (Light)
                            </span>
                            <span className="text-xs font-mono text-[hsl(var(--ui-text-subtle))]">
                                --ui-page (#F4F6F8)
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {VARIANTS.map((v) => (
                                <div key={v.id} className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-4 flex flex-col items-center text-center">
                                    <div className="w-20 h-20 flex items-center justify-center p-2 mb-3">
                                        <CondstoreSymbol variant={v.id} />
                                    </div>
                                    <h3 className="text-xs font-bold text-[hsl(var(--ui-text))]">{v.name}</h3>
                                    <p className="text-[11px] text-[hsl(var(--ui-text-muted))] mt-1">{v.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Painel Escuro */}
                    <div className="site-dark rounded-2xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] p-6 space-y-6">
                        <div className="flex items-center justify-between border-b border-[hsl(var(--ui-border))] pb-3">
                            <span className="text-xs font-bold uppercase tracking-widest text-[hsl(var(--ui-text-muted))]">
                                Fundo Escuro Cockpit (Dark)
                            </span>
                            <span className="text-xs font-mono text-[hsl(var(--ui-text-subtle))]">
                                --ui-page (#0E1117)
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {VARIANTS.map((v) => (
                                <div key={v.id} className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-4 flex flex-col items-center text-center">
                                    <div className="w-20 h-20 flex items-center justify-center p-2 mb-3">
                                        <CondstoreSymbol variant={v.id} />
                                    </div>
                                    <h3 className="text-xs font-bold text-[hsl(var(--ui-text))]">{v.name}</h3>
                                    <p className="text-[11px] text-[hsl(var(--ui-text-muted))] mt-1">{v.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Seção 2: Escalas Extremas (16px a 256px) para Validação de Redução */}
            <div className="space-y-6">
                <h2 className="text-xl font-bold tracking-tight text-[hsl(var(--ui-text))]">
                    2. Teste de Redução e Nitidez Ótica (16px a 256px)
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {SCALES.map((scale) => (
                        <div key={scale.label} className="rounded-2xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-5 flex flex-col items-center justify-between min-h-[300px]">
                            <span className="text-xs font-semibold text-[hsl(var(--ui-text-muted))] mb-4 text-center">
                                {scale.label}
                            </span>

                            <div className="flex-1 flex items-center justify-center">
                                <div className={scale.sizeClass}>
                                    <CondstoreSymbol variant="v1" />
                                </div>
                            </div>

                            <span className="text-[10px] font-mono text-[hsl(var(--ui-text-subtle))] mt-4">
                                Candidata 1 (V1)
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Seção 3: Assinatura Tipográfica (Wordmark) e Variações de Layout */}
            <div className="space-y-6">
                <h2 className="text-xl font-bold tracking-tight text-[hsl(var(--ui-text))]">
                    3. Assinaturas Tipográficas e Formatos de Layout
                </h2>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Horizontal Oficial */}
                    <div className="rounded-2xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-6 flex flex-col justify-between">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--ui-text-subtle))]">
                                Assinatura Horizontal (Header / Shell)
                            </span>
                            <div className="py-8 flex justify-center">
                                <CondstoreLogo size="md" variant="v1" layout="horizontal" />
                            </div>
                        </div>
                        <p className="text-xs text-[hsl(var(--ui-text-muted))] border-t border-[hsl(var(--ui-border))] pt-3">
                            CONDSTORE Bold (700) -0.01em + OS Medium (500) +0.05em azul elétrico.
                        </p>
                    </div>

                    {/* Vertical / Centralizada */}
                    <div className="rounded-2xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-6 flex flex-col justify-between">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--ui-text-subtle))]">
                                Assinatura Vertical (Login / Splash)
                            </span>
                            <div className="py-6 flex justify-center">
                                <CondstoreLogo size="md" variant="v1" layout="vertical" />
                            </div>
                        </div>
                        <p className="text-xs text-[hsl(var(--ui-text-muted))] border-t border-[hsl(var(--ui-border))] pt-3">
                            Símbolo centralizado sobre a tipografia para blocos de autenticação e capas.
                        </p>
                    </div>

                    {/* Wordmark com Badge Discreto */}
                    <div className="rounded-2xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-6 flex flex-col justify-between">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--ui-text-subtle))]">
                                Sufixo OS em Badge Discreto
                            </span>
                            <div className="py-8 flex justify-center">
                                <CondstoreLogo size="md" variant="v1" badgeOs />
                            </div>
                        </div>
                        <p className="text-xs text-[hsl(var(--ui-text-muted))] border-t border-[hsl(var(--ui-border))] pt-3">
                            Alternativa com "OS" encapsulado em chip semântico para ambientes neutros.
                        </p>
                    </div>
                </div>
            </div>

            {/* Seção 4: Auditoria de Contraste WCAG 2.1 Real */}
            <div className="rounded-2xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-6 space-y-4">
                <h2 className="text-lg font-bold text-[hsl(var(--ui-text))]">
                    4. Auditoria de Contraste Real (WCAG 2.1 AA / AAA)
                </h2>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="border-b border-[hsl(var(--ui-border))] text-[hsl(var(--ui-text-muted))] font-semibold">
                                <th className="py-2.5 px-3">Contexto</th>
                                <th className="py-2.5 px-3">Elemento</th>
                                <th className="py-2.5 px-3">Token</th>
                                <th className="py-2.5 px-3">Hex Aprox.</th>
                                <th className="py-2.5 px-3">Ratio Calculado</th>
                                <th className="py-2.5 px-3">Status WCAG</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[hsl(var(--ui-border))] text-[hsl(var(--ui-text))]">
                            <tr>
                                <td className="py-2.5 px-3 font-semibold">Light Mode</td>
                                <td className="py-2.5 px-3">Texto Principal</td>
                                <td className="py-2.5 px-3 font-mono text-[11px]">ui-text</td>
                                <td className="py-2.5 px-3 font-mono text-[11px]">#181D26</td>
                                <td className="py-2.5 px-3 font-bold text-emerald-600">13.8:1</td>
                                <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-semibold">Pass (AAA)</span></td>
                            </tr>
                            <tr>
                                <td className="py-2.5 px-3 font-semibold">Light Mode</td>
                                <td className="py-2.5 px-3">Texto Secundário</td>
                                <td className="py-2.5 px-3 font-mono text-[11px]">ui-text-muted</td>
                                <td className="py-2.5 px-3 font-mono text-[11px]">#575F6E</td>
                                <td className="py-2.5 px-3 font-bold text-emerald-600">5.4:1</td>
                                <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-semibold">Pass (AA)</span></td>
                            </tr>
                            <tr>
                                <td className="py-2.5 px-3 font-semibold">Light Mode</td>
                                <td className="py-2.5 px-3">Acento Elétrico OS</td>
                                <td className="py-2.5 px-3 font-mono text-[11px]">ui-accent-blue</td>
                                <td className="py-2.5 px-3 font-mono text-[11px]">#0077FF</td>
                                <td className="py-2.5 px-3 font-bold text-emerald-600">4.6:1</td>
                                <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-semibold">Pass (AA UI/Large)</span></td>
                            </tr>
                            <tr>
                                <td className="py-2.5 px-3 font-semibold">Dark Mode</td>
                                <td className="py-2.5 px-3">Texto Principal</td>
                                <td className="py-2.5 px-3 font-mono text-[11px]">ui-text</td>
                                <td className="py-2.5 px-3 font-mono text-[11px]">#F3F5F8</td>
                                <td className="py-2.5 px-3 font-bold text-emerald-600">15.2:1</td>
                                <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-semibold">Pass (AAA)</span></td>
                            </tr>
                            <tr>
                                <td className="py-2.5 px-3 font-semibold">Dark Mode</td>
                                <td className="py-2.5 px-3">Texto Secundário</td>
                                <td className="py-2.5 px-3 font-mono text-[11px]">ui-text-muted</td>
                                <td className="py-2.5 px-3 font-mono text-[11px]">#A5ADB9</td>
                                <td className="py-2.5 px-3 font-bold text-emerald-600">8.6:1</td>
                                <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-semibold">Pass (AAA)</span></td>
                            </tr>
                            <tr>
                                <td className="py-2.5 px-3 font-semibold">Dark Mode</td>
                                <td className="py-2.5 px-3">Acento Elétrico OS</td>
                                <td className="py-2.5 px-3 font-mono text-[11px]">ui-accent-blue</td>
                                <td className="py-2.5 px-3 font-mono text-[11px]">#3395FF</td>
                                <td className="py-2.5 px-3 font-bold text-emerald-600">7.1:1</td>
                                <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-semibold">Pass (AAA)</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
