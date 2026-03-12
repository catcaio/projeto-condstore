'use client';

import { cn } from '@/lib/utils';
import { Check, Minus, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { PageContainer } from './page-container';
import { PageSection } from './page-section';
import { SectionIntro } from './section-intro';

type CellValue = boolean | string;

interface ComparisonRow {
    feature: string;
    operacao: CellValue;
    crescimento: CellValue;
    dominio: CellValue;
}

const rows: ComparisonRow[] = [
    { feature: 'Cotação multi-transportadora', operacao: true, crescimento: true, dominio: true },
    { feature: 'Gestão de pedidos', operacao: true, crescimento: true, dominio: true },
    { feature: 'CRM integrado', operacao: true, crescimento: true, dominio: true },
    { feature: 'WhatsApp operacional', operacao: true, crescimento: true, dominio: true },
    { feature: 'Cockpit de métricas', operacao: 'Básico', crescimento: 'Avançado', dominio: 'Completo' },
    { feature: 'Automação de fluxos', operacao: false, crescimento: true, dominio: 'Customizado' },
    { feature: 'Integração ERP', operacao: false, crescimento: true, dominio: 'Customizada' },
    { feature: 'Multi-tenant', operacao: false, crescimento: true, dominio: true },
    { feature: 'Frank AI operacional', operacao: false, crescimento: true, dominio: 'Avançado' },
    { feature: 'Implantação', operacao: 'Guiada', crescimento: 'Assistida', dominio: 'Sob medida' },
    { feature: 'SLA', operacao: '4h úteis', crescimento: '2h', dominio: '30min (24/7)' },
    { feature: 'Suporte', operacao: 'E-mail + WhatsApp', crescimento: 'Dedicado', dominio: '24/7 dedicado' },
    { feature: 'Branding próprio', operacao: false, crescimento: false, dominio: true },
    { feature: 'Integrações customizadas', operacao: false, crescimento: false, dominio: true },
];

function CellContent({ value }: { value: CellValue }) {
    if (value === true) {
        return <Check className="h-4 w-4 text-[hsl(var(--ui-success))] mx-auto" />;
    }
    if (value === false) {
        return <Minus className="h-4 w-4 text-[hsl(var(--ui-text-subtle)/0.4)] mx-auto" />;
    }
    return (
        <span className="text-xs font-medium text-[hsl(var(--ui-text-muted))]">
            {value}
        </span>
    );
}

export function PlanComparisonGrid() {
    const plans = ['Operação', 'Crescimento', 'Domínio'] as const;

    return (
        <PageSection spacing="lg" borderTop>
            <PageContainer>
                <SectionIntro
                    eyebrow="Comparação"
                    title="Comparar planos"
                />

                {/* Scrollable wrapper for mobile */}
                <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
                    <table className="w-full min-w-[600px] border-collapse">
                        <thead>
                            <tr>
                                <th className="sticky left-0 z-10 bg-[hsl(var(--ui-page))] text-left text-xs font-bold uppercase tracking-[0.12em] text-[hsl(var(--ui-text-subtle))] py-4 pr-4 w-[200px] md:w-[260px]">
                                    Funcionalidade
                                </th>
                                {plans.map((plan) => (
                                    <th
                                        key={plan}
                                        className={cn(
                                            'text-center text-sm font-bold py-4 px-3',
                                            plan === 'Crescimento'
                                                ? 'text-[hsl(var(--ui-accent-blue))]'
                                                : 'text-[hsl(var(--ui-text))]'
                                        )}
                                    >
                                        {plan}
                                        {plan === 'Crescimento' && (
                                            <span className="block text-[10px] font-semibold text-[hsl(var(--ui-accent-blue)/0.7)] mt-0.5">
                                                Recomendado
                                            </span>
                                        )}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, i) => (
                                <tr
                                    key={row.feature}
                                    className={cn(
                                        'group transition-colors hover:bg-[hsl(var(--ui-surface)/0.3)]',
                                        i % 2 === 0 ? 'bg-transparent' : 'bg-[hsl(var(--ui-surface)/0.1)]'
                                    )}
                                >
                                    <td className="sticky left-0 z-10 bg-inherit text-sm font-medium text-[hsl(var(--ui-text-muted))] py-3.5 pr-4 group-hover:text-[hsl(var(--ui-text))] transition-colors">
                                        {row.feature}
                                    </td>
                                    <td className="text-center py-3.5 px-3">
                                        <CellContent value={row.operacao} />
                                    </td>
                                    <td className={cn(
                                        'text-center py-3.5 px-3 border-x border-[hsl(var(--ui-accent-blue)/0.1)]',
                                        'bg-[hsl(var(--ui-accent-blue)/0.02)]'
                                    )}>
                                        <CellContent value={row.crescimento} />
                                    </td>
                                    <td className="text-center py-3.5 px-3">
                                        <CellContent value={row.dominio} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* CTA below comparison */}
                <div className="mt-10 flex justify-center">
                    <Link
                        href="/about"
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-[hsl(var(--ui-accent-blue))] text-white text-sm font-bold h-12 px-8 hover:bg-[hsl(var(--ui-accent-blue-strong))] shadow-sm shadow-[hsl(var(--ui-accent-blue)/0.2)] transition-all"
                    >
                        Solicitar proposta — Crescimento
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </PageContainer>
        </PageSection>
    );
}
