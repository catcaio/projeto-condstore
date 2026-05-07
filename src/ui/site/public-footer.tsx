import Link from 'next/link';
import { CondstoreLogo } from '@/ui/components/Logo';

const primaryCta = { label: 'Iniciar operação no MVP', href: '/signup' } as const;
const secondaryCta = { label: 'Como funciona o MVP', href: '/como-funciona' } as const;

const mvpLinks = [
    { label: 'Home', href: '/' },
    { label: 'Produto', href: '/produto' },
    { label: 'Como funciona', href: '/como-funciona' },
    { label: 'Soluções', href: '/solucoes' },
    { label: 'Prova Operacional', href: '/proof' },
];

const companyLinks = [
    { label: 'Contato', href: '/contato' },
    { label: 'Entrar', href: '/login' },
    { label: 'Privacidade', href: '/privacidade' },
    { label: 'Termos', href: '/termos' },
];

export function PublicFooter() {
    return (
        <footer className="border-t border-[hsl(var(--ui-border)/0.3)] bg-[hsl(var(--ui-page))]">
            <div className="mx-auto max-w-[var(--container-max-width)] px-6 lg:px-8 py-16 md:py-20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
                    {/* Brand column */}
                    <div>
                        <Link href="/">
                            <CondstoreLogo size="sm" hideSubtitle />
                        </Link>
                        <p className="mt-4 text-sm text-[hsl(var(--ui-text-muted))] leading-relaxed max-w-xs">
                            Site oficial do MVP do CONDSTORE OS: operação supervisionada via WhatsApp, aprovação antes do pedido e cockpit vivo de execução.
                        </p>
                        <div className="mt-6 flex flex-col gap-3">
                            <Link
                                href={primaryCta.href}
                                className="inline-flex h-10 items-center justify-center rounded-full bg-[hsl(var(--ui-accent-blue))] px-5 text-sm font-bold text-white transition-all hover:bg-[hsl(var(--ui-accent-blue-strong))]"
                            >
                                {primaryCta.label}
                            </Link>
                            <Link
                                href={secondaryCta.href}
                                className="text-sm font-semibold text-[hsl(var(--ui-text-muted))] hover:text-[hsl(var(--ui-text))] transition-colors"
                            >
                                {secondaryCta.label}
                            </Link>
                        </div>
                    </div>

                    {/* MVP */}
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-[hsl(var(--ui-text-subtle))] mb-4">
                            MVP oficial
                        </h4>
                        <ul className="space-y-2.5">
                            {mvpLinks.map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href} className="text-sm text-[hsl(var(--ui-text-muted))] hover:text-[hsl(var(--ui-text))] transition-colors">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Empresa */}
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-[hsl(var(--ui-text-subtle))] mb-4">
                            Acesso e legal
                        </h4>
                        <ul className="space-y-2.5">
                            {companyLinks.map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href} className="text-sm text-[hsl(var(--ui-text-muted))] hover:text-[hsl(var(--ui-text))] transition-colors">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="mt-14 pt-6 border-t border-[hsl(var(--ui-border)/0.3)] flex flex-col md:flex-row justify-between items-center gap-4">
                    <span className="text-xs text-[hsl(var(--ui-text-subtle))]">
                        &copy; {new Date().getFullYear()} CONDSTORE OS. Todos os direitos reservados. CNPJ: 29.578.208/0001-11
                    </span>
                    <div className="flex gap-6 text-xs text-[hsl(var(--ui-text-subtle))]">
                        <Link href="/seguranca" className="hover:text-[hsl(var(--ui-text-muted))] transition-colors">Segurança</Link>
                        <Link href="/privacidade" className="hover:text-[hsl(var(--ui-text-muted))] transition-colors">Privacidade</Link>
                        <Link href="/termos" className="hover:text-[hsl(var(--ui-text-muted))] transition-colors">Termos</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
