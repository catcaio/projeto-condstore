import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { tenantRepository } from '@/infra/repositories/tenant.repository';
import { Button } from '@/ui/components';
import { Shield, BriefcaseBusiness, Store } from 'lucide-react';
import Link from 'next/link';

interface TenantLandingPageProps {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: TenantLandingPageProps): Promise<Metadata> {
    const { slug } = await params;
    try {
        const tenant = await tenantRepository.resolveTenantBySlug(slug);
        return {
            title: `${tenant.name} | CondStore OS`,
            description: `Portal de acesso para colaboradores e gestores de ${tenant.name}.`,
        };
    } catch {
        return {
            title: 'Loja não encontrada | CondStore OS',
        };
    }
}

export default async function TenantLandingPage({ params }: TenantLandingPageProps) {
    const { slug } = await params;

    let tenant;
    try {
        tenant = await tenantRepository.resolveTenantBySlug(slug);
    } catch {
        notFound();
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[hsl(var(--ui-background))] py-12 px-4 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-md text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[hsl(var(--ui-accent-blue)/0.1)] text-[hsl(var(--ui-accent-blue))] mb-6">
                    <Store className="h-8 w-8" />
                </div>

                <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--ui-text))] mb-2">
                    {tenant.name}
                </h1>

                <p className="text-sm text-[hsl(var(--ui-text-muted))] mb-8">
                    Selecione o seu perfil de acesso ao painel da operação logística.
                </p>

                <div className="flex flex-col gap-4">
                    <Link href={`/t/${slug}/gestao/entrar`} passHref legacyBehavior>
                        <Button variant="primary" size="lg" className="w-full justify-between group h-14">
                            <span className="flex items-center gap-3 text-base">
                                <Shield className="h-5 w-5 opacity-70 group-hover:opacity-100" />
                                Acessar Gestão
                            </span>
                        </Button>
                    </Link>

                    <Link href={`/t/${slug}/entrar`} passHref legacyBehavior>
                        <Button variant="secondary" size="lg" className="w-full justify-between group h-14">
                            <span className="flex items-center gap-3 text-base">
                                <BriefcaseBusiness className="h-5 w-5 opacity-70 group-hover:opacity-100 text-[hsl(var(--ui-accent-purple))]" />
                                Acesso Operacional (Funcionário)
                            </span>
                        </Button>
                    </Link>
                </div>

                <div className="mt-8 pt-6 border-t border-[hsl(var(--ui-border)/0.5)]">
                    <p className="text-xs text-[hsl(var(--ui-text-muted))]">
                        Powered by <span className="font-semibold text-[hsl(var(--ui-text))]">CondStore OS</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
