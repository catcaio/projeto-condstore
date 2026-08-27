import Link from 'next/link';
import { AgilizapLogo } from '@/ui/components/AgilizapLogo';

const primaryCta = { label: 'Solicitar avaliação operacional', href: '/piloto' } as const;
const secondaryCta = { label: 'Entrar no sistema', href: '/login' } as const;

const navAnchors = [
    { label: 'Produto', href: '/#produto' },
    { label: 'Como funciona', href: '/#como-funciona' },
    { label: 'Frank AI Supervisionado', href: '/#frank-ai' },
    { label: 'Tecnologia & Multi-tenant', href: '/#tecnologia' },
];

const companyLinks = [
    { label: 'Piloto Operacional', href: '/piloto' },
    { label: 'FAQ', href: '/faq' },
    { label: 'Contato', href: '/contato' },
    { label: 'Entrar', href: '/login' },
];

export function PublicFooter() {
    return (
        <footer className="border-t border-slate-800/80 bg-[#0B0E13] text-slate-400">
            <div className="mx-auto max-w-[var(--container-max-width)] px-6 lg:px-8 py-16 md:py-20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
                    {/* Brand column */}
                    <div>
                        <Link href="/">
                            <AgilizapLogo size="sm" hideTagline={false} />
                        </Link>
                        <p className="mt-4 text-sm text-slate-400 leading-relaxed max-w-xs font-body">
                            AGILIZAP transforma contatos, negociações e operações fragmentadas em um fluxo comercial contínuo com supervisão humana.
                        </p>
                        <div className="mt-6 flex flex-col gap-3">
                            <Link
                                href={primaryCta.href}
                                className="inline-flex h-10 items-center justify-center rounded-full bg-[#3E5CFF] px-5 text-sm font-semibold text-white transition-all hover:bg-[#3E5CFF]/90 shadow-md shadow-[#3E5CFF]/25"
                            >
                                {primaryCta.label}
                            </Link>
                            <Link
                                href={secondaryCta.href}
                                className="text-xs font-mono font-medium text-slate-300 hover:text-white transition-colors"
                            >
                                {secondaryCta.label}
                            </Link>
                        </div>
                    </div>

                    {/* Fluxo */}
                    <div>
                        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-4">
                            Navegação
                        </h4>
                        <ul className="space-y-2.5 font-mono text-xs">
                            {navAnchors.map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href} className="text-slate-400 hover:text-white transition-colors">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Acesso e legal */}
                    <div>
                        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-4">
                            Acesso &amp; Transparência
                        </h4>
                        <ul className="space-y-2.5 font-mono text-xs">
                            {companyLinks.map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href} className="text-slate-400 hover:text-white transition-colors">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="mt-14 pt-6 border-t border-slate-800/80 flex flex-col md:flex-row justify-between items-center gap-4 font-mono text-xs text-slate-500">
                    <span>
                        &copy; {new Date().getFullYear()} AGILIZAP. Operação Comercial Contínua. Todos os direitos reservados.
                    </span>
                    <div className="flex gap-6">
                        <Link href="/seguranca" className="hover:text-slate-300 transition-colors">Segurança &amp; Multi-Tenant</Link>
                        <Link href="/privacidade" className="hover:text-slate-300 transition-colors">Privacidade</Link>
                        <Link href="/termos" className="hover:text-slate-300 transition-colors">Termos</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
