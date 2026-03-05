import Link from 'next/link';
import { Truck, BarChart3, Bot, CheckCircle2, LifeBuoy, PackageOpen, LayoutDashboard } from 'lucide-react';
import { Button } from '@/ui/components/button';
import { CaseProofSection } from '@/ui/components/case-proof-section';
import { HowItWorksSection } from '@/ui/components/how-it-works-section';
import { TrackedLink, SectionTracker } from '@/ui/lib/track-client';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { ENABLE_CONCEPT_LAYER } from '@/config/flags';

const ConceptHero = dynamic(() => import("../(marketing)/concept-layer/ConceptHero"), { ssr: true });

export const metadata = {
    title: 'LojaCond | Automação Logística',
    description: 'Automatize o frete da sua loja. Rescue, Logistics e Full OS integrados.',
};

export const revalidate = 86400; // 24h caching for Edge network

export default function PublicHomePage() {
    const isDev = process.env.NODE_ENV === 'development';

    return (
        <>
            {ENABLE_CONCEPT_LAYER && <ConceptHero />}
            <div className="mx-auto max-w-7xl px-6 lg:px-8 py-20 lg:py-32 flex flex-col items-center text-center gap-16 relative">
                <SectionTracker page="landing" section="hero" />

                <div className="max-w-4xl space-y-6 relative z-10 text-center flex flex-col items-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[hsl(var(--ui-accent-blue)/0.1)] border border-[hsl(var(--ui-accent-blue)/0.2)] text-[hsl(var(--ui-accent-blue))] text-xs font-semibold uppercase tracking-widest mb-4">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--ui-accent-blue))] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[hsl(var(--ui-accent-blue))]"></span>
                        </span>
                        A CPU da Logística Brasileira
                    </div>
                    <h1 className="text-5xl md:text-7xl font-extrabold text-[hsl(var(--ui-text))] leading-[1.1] tracking-tight mb-6">
                        O motor de processamento central para <span className="text-transparent bg-clip-text bg-gradient-to-r from-[hsl(var(--ui-accent-blue))] to-[hsl(var(--ui-accent-blue-strong))]">operações complexas.</span>
                    </h1>
                    <p className="text-lg md:text-2xl text-[hsl(var(--ui-text-muted))] max-w-2xl leading-relaxed">
                        Esqueça planilhas e integrações frágeis. O Condstore OS é a CPU unificada que roteia, cota, resgata e unifica toda a sua operação logística no Brasil.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-10">
                        <TrackedLink
                            href="/pricing"
                            trackPage="landing"
                            trackSection="hero"
                            trackElement="hero_primary"
                            className="inline-flex items-center justify-center gap-2 rounded-full border text-sm font-bold transition-all border-transparent bg-[hsl(var(--ui-accent-blue))] text-white hover:bg-[hsl(var(--ui-accent-blue-strong))] hover:scale-105 hover:shadow-lg hover:shadow-[hsl(var(--ui-accent-blue)/0.2)] h-12 px-8 w-full sm:w-auto"
                        >
                            Começar agora
                        </TrackedLink>
                        <TrackedLink
                            href="#como-funciona"
                            trackPage="landing"
                            trackSection="hero"
                            trackElement="hero_demo"
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] text-[hsl(var(--ui-text))] hover:bg-[hsl(var(--ui-muted))] hover:scale-105 transition-all h-12 px-8 w-full sm:w-auto font-semibold"
                        >
                            Ver demo
                        </TrackedLink>
                    </div>
                </div>

                <div className="mt-8 relative w-full max-w-5xl aspect-[21/9] rounded-2xl overflow-hidden border border-[hsl(var(--ui-border)/0.5)] shadow-2xl bg-[hsl(var(--ui-surface))] flex items-center justify-center mb-12">
                    <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--ui-surface))] via-transparent to-transparent z-10 pointer-events-none" />
                    <img
                        src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2070&auto=format&fit=crop"
                        alt="Condstore OS Core Engine Visualization"
                        className="w-full h-full object-cover opacity-80 mix-blend-luminosity hover:mix-blend-normal transition-all duration-700"
                    />
                </div>

                {/* QUICK ACCESS ECOSYSTEM */}
                <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 mb-16 relative z-20">
                    <TrackedLink
                        href="/cotacao"
                        trackPage="landing"
                        trackSection="quick_access"
                        trackElement="quick_quote"
                        className="group flex items-center gap-4 p-5 rounded-2xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] hover:bg-[hsl(var(--ui-muted)/0.5)] hover:border-[hsl(var(--ui-accent-blue)/0.4)] transition-all shadow-sm hover:shadow-md"
                    >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--ui-accent-blue)/0.1)] text-[hsl(var(--ui-accent-blue))] group-hover:scale-110 transition-transform">
                            <Truck className="h-6 w-6" />
                        </div>
                        <div className="text-left">
                            <h3 className="text-sm font-bold text-[hsl(var(--ui-text))]">Cotação Rápida</h3>
                            <p className="text-xs text-[hsl(var(--ui-text-muted))] mt-0.5">Faça sua simulação de frete instantânea.</p>
                        </div>
                    </TrackedLink>

                    <TrackedLink
                        href="/integracoes"
                        trackPage="landing"
                        trackSection="quick_access"
                        trackElement="quick_integrations"
                        className="group flex items-center gap-4 p-5 rounded-2xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] hover:bg-[hsl(var(--ui-muted)/0.5)] hover:border-[hsl(var(--ui-brand)/0.4)] transition-all shadow-sm hover:shadow-md"
                    >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--ui-brand)/0.1)] text-[hsl(var(--ui-brand))] group-hover:scale-110 transition-transform">
                            <PackageOpen className="h-6 w-6" />
                        </div>
                        <div className="text-left">
                            <h3 className="text-sm font-bold text-[hsl(var(--ui-text))]">Integrações (Hub)</h3>
                            <p className="text-xs text-[hsl(var(--ui-text-muted))] mt-0.5">APIs Diretas (Correios, Jadlog, Itaú e mais).</p>
                        </div>
                    </TrackedLink>

                    <TrackedLink
                        href="/plataforma/cockpit"
                        trackPage="landing"
                        trackSection="quick_access"
                        trackElement="quick_cockpit"
                        className="group flex items-center gap-4 p-5 rounded-2xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] hover:bg-[hsl(var(--ui-muted)/0.5)] hover:border-[hsl(var(--ui-accent-purple)/0.4)] transition-all shadow-sm hover:shadow-md"
                    >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--ui-accent-purple)/0.1)] text-[hsl(var(--ui-accent-purple))] group-hover:scale-110 transition-transform">
                            <LayoutDashboard className="h-6 w-6" />
                        </div>
                        <div className="text-left">
                            <h3 className="text-sm font-bold text-[hsl(var(--ui-text))]">O seu Cockpit</h3>
                            <p className="text-xs text-[hsl(var(--ui-text-muted))] mt-0.5">Explore sua Área de Trabalho Logística B2B.</p>
                        </div>
                    </TrackedLink>
                </div>

                <HowItWorksSection />

                <div className="py-24 border-y border-[hsl(var(--ui-border)/0.5)] w-full relative">
                    {/* Background Glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[hsl(var(--ui-brand)/0.05)] blur-[120px] rounded-full pointer-events-none" />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10 w-full">
                        {/* RESCUE BLOCK */}
                        <div className="group relative flex flex-col gap-6 bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border))] rounded-3xl p-8 hover:border-[hsl(var(--ui-danger)/0.4)] hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--ui-danger)/0.03)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[hsl(var(--ui-danger)/0.15)] to-[hsl(var(--ui-danger)/0.05)] border border-[hsl(var(--ui-danger)/0.2)] flex items-center justify-center text-[hsl(var(--ui-danger))] shadow-inner group-hover:scale-110 transition-transform duration-500 ease-out">
                                <LifeBuoy className="h-7 w-7" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-[hsl(var(--ui-text))] mb-2 tracking-tight">Rescue</h3>
                                <div className="h-1 w-12 bg-gradient-to-r from-[hsl(var(--ui-danger))] to-transparent rounded-full mb-4 opacity-70"></div>
                                <p className="text-sm font-semibold text-[hsl(var(--ui-danger))] mb-3 uppercase tracking-wider">Recuperação e Retenção</p>
                                <p className="text-base text-[hsl(var(--ui-text-muted))] leading-relaxed">Fluxos de WhatsApp nativos que reengajam boletos, pix não pagos e carrinhos abandonados conectando sua transportadora à conversão.</p>
                            </div>
                        </div>

                        {/* LOGISTICS BLOCK (Center - Elevated) */}
                        <div className="group relative flex flex-col gap-6 bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-accent-blue)/0.3)] rounded-3xl p-8 shadow-lg hover:border-[hsl(var(--ui-accent-blue)/0.6)] hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 overflow-hidden md:-mt-4 md:mb-4">
                            <div className="absolute inset-0 bg-gradient-to-b from-[hsl(var(--ui-accent-blue)/0.05)] to-transparent pointer-events-none" />
                            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--ui-accent-blue)/0.08)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                            <div className="absolute top-0 right-6 transform -translate-y-1/2 rounded-full py-1.5 px-4 bg-gradient-to-r from-[hsl(var(--ui-accent-blue))] to-[hsl(var(--ui-brand))] text-white text-[11px] font-bold uppercase tracking-widest shadow-md">
                                Core Engine
                            </div>
                            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[hsl(var(--ui-accent-blue)/0.2)] to-[hsl(var(--ui-accent-blue)/0.05)] border border-[hsl(var(--ui-accent-blue)/0.3)] flex items-center justify-center text-[hsl(var(--ui-accent-blue))] shadow-inner group-hover:scale-110 transition-transform duration-500 ease-out">
                                <PackageOpen className="h-7 w-7" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-[hsl(var(--ui-text))] mb-2 tracking-tight">Logistics</h3>
                                <div className="h-1 w-12 bg-gradient-to-r from-[hsl(var(--ui-accent-blue))] to-transparent rounded-full mb-4 opacity-70"></div>
                                <p className="text-sm font-semibold text-[hsl(var(--ui-accent-blue))] mb-3 uppercase tracking-wider">Gateway Zero-touch</p>
                                <p className="text-base text-[hsl(var(--ui-text-muted))] leading-relaxed">Acesso a mais de 30 operadoras logísticas. Você controla as margens por UTM e garante a entrega mais barata em mili-segundos.</p>
                            </div>
                        </div>

                        {/* FULL OS BLOCK */}
                        <div className="group relative flex flex-col gap-6 bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border))] rounded-3xl p-8 hover:border-[hsl(var(--ui-success)/0.4)] hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--ui-success)/0.03)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[hsl(var(--ui-success)/0.15)] to-[hsl(var(--ui-success)/0.05)] border border-[hsl(var(--ui-success)/0.2)] flex items-center justify-center text-[hsl(var(--ui-success))] shadow-inner group-hover:scale-110 transition-transform duration-500 ease-out">
                                <LayoutDashboard className="h-7 w-7" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-[hsl(var(--ui-text))] mb-2 tracking-tight">Full OS</h3>
                                <div className="h-1 w-12 bg-gradient-to-r from-[hsl(var(--ui-success))] to-transparent rounded-full mb-4 opacity-70"></div>
                                <p className="text-sm font-semibold text-[hsl(var(--ui-success))] mb-3 uppercase tracking-wider">Visibilidade Total</p>
                                <p className="text-base text-[hsl(var(--ui-text-muted))] leading-relaxed">Relatórios avançados integrando Custo de Frete, ROI, CAC e rastreamento impulsivo unificando toda sua frota.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ARCHITECTURE SECTION */}
                <div className="w-full max-w-6xl py-20 border-t border-[hsl(var(--ui-border)/0.5)]">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[hsl(var(--ui-accent-purple)/0.1)] border border-[hsl(var(--ui-accent-purple)/0.2)] text-[hsl(var(--ui-accent-purple))] text-xs font-semibold uppercase tracking-widest mb-6">
                                Engenharia Distribuída
                            </div>
                            <h2 className="text-4xl font-extrabold tracking-tight text-[hsl(var(--ui-text))] mb-6 leading-tight">
                                Arquitetura <span className="text-transparent bg-clip-text bg-gradient-to-r from-[hsl(var(--ui-accent-purple))] to-[#a78bfa]">Zero-Touch.</span>
                            </h2>
                            <p className="text-lg text-[hsl(var(--ui-text-muted))] leading-relaxed mb-6 font-light">
                                Desenhada para ambientes de alta volumetria. A partir do momento do checkout, o Condstore OS assume todo o processamento de regras logísticas de forma invisível.
                            </p>
                            <ul className="space-y-4">
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 className="w-6 h-6 text-[hsl(var(--ui-accent-purple))] shrink-0 mt-0.5" />
                                    <div>
                                        <strong className="text-[hsl(var(--ui-text))] block mb-1 tracking-tight">Cotações em borda (Edge)</strong>
                                        <span className="text-[hsl(var(--ui-text-subtle))] text-sm">Respostas em menos de 50ms (p99) para taxas de conversão máximas.</span>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 className="w-6 h-6 text-[hsl(var(--ui-accent-purple))] shrink-0 mt-0.5" />
                                    <div>
                                        <strong className="text-[hsl(var(--ui-text))] block mb-1 tracking-tight">Failover Automático</strong>
                                        <span className="text-[hsl(var(--ui-text-subtle))] text-sm">Roteamento redundante entre APIs de operadoras lógicas, garantindo 99.99% de uptime de cotação.</span>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 className="w-6 h-6 text-[hsl(var(--ui-accent-purple))] shrink-0 mt-0.5" />
                                    <div>
                                        <strong className="text-[hsl(var(--ui-text))] block mb-1 tracking-tight">Background Processing</strong>
                                        <span className="text-[hsl(var(--ui-text-subtle))] text-sm">Geração de etiquetas, PLP e notas fiscais de forma assíncrona, não bloqueante.</span>
                                    </div>
                                </li>
                            </ul>
                        </div>
                        <div className="relative rounded-2xl overflow-hidden border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface-elevated))] shadow-2xl p-6 lg:p-8 flex flex-col justify-center gap-4 group">
                            <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--ui-border)/0.5)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--ui-border)/0.5)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

                            {/* Abstract Code UI representation */}
                            <div className="space-y-3 font-mono text-xs w-full max-w-sm mx-auto opacity-90 backdrop-blur-sm bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border))] p-4 rounded-lg relative z-10 shadow-lg group-hover:-translate-y-1 transition-transform duration-500">
                                <div className="text-[hsl(var(--ui-text-muted))]">// Requesting quotation</div>
                                <div><span className="text-pink-400">POST</span> <span className="text-green-400">/v1/quotes</span></div>
                                <div className="flex gap-2"><span className="text-yellow-300">"zipcode_from"</span>: <span className="text-blue-300">"01000-000"</span></div>
                                <div className="flex gap-2"><span className="text-yellow-300">"zipcode_to"</span>: <span className="text-blue-300">"20000-000"</span></div>
                                <div className="text-[hsl(var(--ui-text-muted))] pt-2">// Response time: 42ms (Edge Cache Hit)</div>
                                <div className="flex gap-2"><span className="text-yellow-300">"service"</span>: <span className="text-blue-300">"SEDEX"</span></div>
                                <div className="flex gap-2"><span className="text-yellow-300">"price"</span>: <span className="text-purple-300">18.50</span></div>
                            </div>

                            <div className="mx-auto h-8 border-l-2 border-dashed border-[hsl(var(--ui-accent-purple)/0.5)] relative z-10"></div>

                            <div className="space-y-3 font-mono text-xs w-full max-w-sm mx-auto opacity-90 backdrop-blur-sm bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border))] p-4 rounded-lg relative z-10 shadow-lg group-hover:-translate-y-1 transition-transform duration-500 delay-100">
                                <div className="text-[hsl(var(--ui-text-muted))]">// Delivery Webhook Triggered</div>
                                <div><span className="text-pink-400">const</span> event = <span className="text-orange-300">"DELIVERY_COMPLETED"</span>;</div>
                                <div><span className="text-pink-400">await</span> <span className="text-blue-400">dispatchInvoiceSync</span>(orderId);</div>
                                <div className="text-green-500 font-bold mt-2">✓ Workflow execution succeeded</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* MASSIVE BOTTOM CTA */}
                <div className="w-full max-w-6xl mt-12 md:mt-24 mb-32 relative rounded-[3rem] overflow-hidden bg-[hsl(var(--ui-surface-elevated))] border border-[hsl(var(--ui-border)/0.5)] p-12 md:p-24 text-center flex flex-col items-center group shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--ui-accent-blue)/0.05)] via-[hsl(var(--ui-surface-elevated))] to-[hsl(var(--ui-accent-purple)/0.05)] pointer-events-none group-hover:scale-105 transition-transform duration-1000" />
                    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--ui-accent-blue)/0.5)] to-transparent opacity-50" />
                    <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--ui-accent-purple)/0.5)] to-transparent opacity-50" />

                    <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-[hsl(var(--ui-text))] mb-6 relative z-10 leading-tight">
                        Pronto para mudar a <br className="hidden md:block" />sua operação logística?
                    </h2>
                    <p className="text-lg md:text-xl text-[hsl(var(--ui-text-muted))] max-w-2xl mx-auto mb-12 relative z-10 font-light leading-relaxed">
                        Junte-se às empresas que já processam milhares de envios por dia com zero-touch, utilizando a inteligência de roteamento do Condstore OS.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 relative z-10 w-full justify-center max-w-md mx-auto sm:max-w-none">
                        <TrackedLink
                            href="/login"
                            trackPage="landing"
                            trackSection="bottom_cta"
                            trackElement="bottom_primary"
                            className="inline-flex items-center justify-center gap-2 rounded-full font-bold transition-all bg-[hsl(var(--ui-accent-blue))] text-white hover:bg-[hsl(var(--ui-accent-blue-strong))] hover:scale-[1.02] shadow-xl shadow-[hsl(var(--ui-accent-blue)/0.2)] h-14 px-10 text-lg w-full sm:w-auto"
                        >
                            Começar agora
                        </TrackedLink>
                        <TrackedLink
                            href="/docs"
                            trackPage="landing"
                            trackSection="bottom_cta"
                            trackElement="bottom_secondary"
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] text-[hsl(var(--ui-text))] hover:bg-[hsl(var(--ui-border)/0.5)] hover:scale-[1.02] transition-all h-14 px-10 text-lg font-semibold w-full sm:w-auto shadow-sm"
                        >
                            Ler a Documentação
                        </TrackedLink>
                    </div>
                </div>

            </div>
        </>
    );
}
