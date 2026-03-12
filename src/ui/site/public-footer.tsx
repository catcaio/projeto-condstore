import Link from 'next/link';
import { CondstoreLogo } from '@/ui/components/Logo';

const productLinks = [
    { label: 'Condstore Envios', href: '/produtos/envios' },
    { label: 'Condstore CRM', href: '/produtos/crm' },
    { label: 'Condstore DOMINE', href: '/produtos/domine' },
];

const platformLinks = [
    { label: 'Plataforma', href: '/plataforma' },
    { label: 'App do ecossistema', href: '/app' },
    { label: 'Segurança', href: '/seguranca' },
    { label: 'Implantação', href: '/implantacao' },
    { label: 'Valores', href: '/valores' },
];

const resourceLinks = [
    { label: 'Como funciona', href: '/como-funciona' },
    { label: 'Soluções', href: '/solucoes' },
    { label: 'Casos', href: '/casos' },
    { label: 'Documentação', href: '/docs' },
];

export function PublicFooter() {
    return (
        <footer className="border-t border-[hsl(var(--ui-border)/0.3)] bg-[hsl(var(--ui-page))]">
            <div className="mx-auto max-w-[var(--container-max-width)] px-6 lg:px-8 py-16 md:py-20">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-8">
                    {/* Brand column */}
                    <div className="col-span-2 md:col-span-1">
                        <Link href="/">
                            <CondstoreLogo size="sm" hideSubtitle />
                        </Link>
                        <p className="mt-4 text-sm text-[hsl(var(--ui-text-muted))] leading-relaxed max-w-xs">
                            Infraestrutura operacional premium para logística B2B brasileira.
                        </p>
                    </div>

                    {/* Product */}
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-[hsl(var(--ui-text-subtle))] mb-4">
                            Produto
                        </h4>
                        <ul className="space-y-2.5">
                            {productLinks.map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href} className="text-sm text-[hsl(var(--ui-text-muted))] hover:text-[hsl(var(--ui-text))] transition-colors">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Platform */}
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-[hsl(var(--ui-text-subtle))] mb-4">
                            Plataforma
                        </h4>
                        <ul className="space-y-2.5">
                            {platformLinks.map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href} className="text-sm text-[hsl(var(--ui-text-muted))] hover:text-[hsl(var(--ui-text))] transition-colors">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Resources */}
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-[hsl(var(--ui-text-subtle))] mb-4">
                            Recursos
                        </h4>
                        <ul className="space-y-2.5">
                            {resourceLinks.map((link) => (
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
                        &copy; {new Date().getFullYear()} CONDSTORE OS. Todos os direitos reservados. CNPJ: 29.578.008/0001-11
                    </span>
                    <div className="flex gap-6 text-xs text-[hsl(var(--ui-text-subtle))]">
                        <Link href="/privacidade" className="hover:text-[hsl(var(--ui-text-muted))] transition-colors">Privacidade</Link>
                        <Link href="/termos" className="hover:text-[hsl(var(--ui-text-muted))] transition-colors">Termos</Link>
                        <Link href="/seguranca" className="hover:text-[hsl(var(--ui-text-muted))] transition-colors">Segurança</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
