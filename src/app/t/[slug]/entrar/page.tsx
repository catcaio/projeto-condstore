import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { tenantRepository } from '@/infra/repositories/tenant.repository';
import { LoginForm } from '@/app/login/login-form';

interface TenantEmployeeLoginPageProps {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: TenantEmployeeLoginPageProps): Promise<Metadata> {
    const { slug } = await params;
    try {
        const tenant = await tenantRepository.resolveTenantBySlug(slug);
        return {
            title: `Logística - ${tenant.name} | CondStore OS`,
            description: `Painel de operação para a loja ${tenant.name}.`,
        };
    } catch {
        return {
            title: 'Loja não encontrada',
        };
    }
}

function detectBuildLabel(): string {
    const env = process.env.VERCEL_ENV?.trim() || process.env.NODE_ENV || 'local';
    const sha =
        process.env.GIT_SHA?.trim() ||
        process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
        process.env.COMMIT_SHA?.trim() ||
        'dev';

    return `ENV: ${env} / SHA: ${sha.slice(0, 12)}`;
}

export default async function TenantEmployeeLoginPage({ params }: TenantEmployeeLoginPageProps) {
    const { slug } = await params;

    let tenant;
    try {
        tenant = await tenantRepository.resolveTenantBySlug(slug);
    } catch {
        notFound();
    }

    return (
        <LoginForm
            buildLabel={detectBuildLabel()}
            title={tenant.name}
            description="Painel de Operação (Funcionário)"
            slug={slug}
            redirectMode="employee"
        />
    );
}
