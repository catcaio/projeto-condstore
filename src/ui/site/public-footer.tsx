import Link from 'next/link';

const flowLinks = [
    { label: 'Produto', href: '#produto' },
    { label: 'Como funciona', href: '#como-funciona' },
    { label: 'Frank AI', href: '#frank' },
    { label: 'Tecnologia', href: '#tecnologia' },
];

const accessLinks = [
    { label: 'Conhecer o AGILIZAP', href: '/piloto' },
    { label: 'Entrar', href: '/login' },
    { label: 'Segurança', href: '/seguranca' },
    { label: 'Privacidade', href: '/privacidade' },
    { label: 'Termos', href: '/termos' },
];

function AgilizapMark() {
    return (
        <span className="flex items-center gap-2.5" aria-label="AGILIZAP">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M3 4.5h8.5M3 9.75h14M3 15.5h8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M13.5 4.5 17 9.75l-3.5 5.75" stroke="var(--ag-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-[family-name:var(--font-space)] text-[15px] font-bold tracking-[-0.04em]">AGILIZAP</span>
        </span>
    );
}

export function PublicFooter() {
    return (
        <footer className="border-t border-black/[0.08] bg-[var(--ag-paper)]">
            <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-16">
                <div className="grid gap-10 md:grid-cols-[1.4fr_0.8fr_0.8fr]">
                    <div>
                        <Link href="/" className="inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"><AgilizapMark /></Link>
                        <p className="mt-4 max-w-xs text-sm leading-6 text-black/50">Um fluxo comercial contínuo entre contato, negociação, proposta, pedido e execução.</p>
                    </div>
                    <div>
                        <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-black/40">Fluxo</h2>
                        <ul className="mt-4 space-y-2.5">
                            {flowLinks.map((link) => <li key={link.href}><a href={link.href} className="text-sm text-black/55 transition-colors hover:text-black">{link.label}</a></li>)}
                        </ul>
                    </div>
                    <div>
                        <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-black/40">Acesso</h2>
                        <ul className="mt-4 space-y-2.5">
                            {accessLinks.map((link) => <li key={link.href}><Link href={link.href} className="text-sm text-black/55 transition-colors hover:text-black">{link.label}</Link></li>)}
                        </ul>
                    </div>
                </div>
                <div className="mt-12 flex flex-col gap-3 border-t border-black/[0.08] pt-5 text-xs text-black/35 sm:flex-row sm:items-center sm:justify-between">
                    <span>© {new Date().getFullYear()} AGILIZAP. Todos os direitos reservados.</span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em]">SaaS multi-tenant</span>
                </div>
            </div>
        </footer>
    );
}
