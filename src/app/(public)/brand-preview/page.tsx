import { Metadata } from 'next';
import { PageContainer } from '@/ui/site';
import { BrandPreviewClient } from './brand-preview.client';

export const metadata: Metadata = {
    title: 'Visual Identity Preview & Review | CONDSTORE OS',
    description: 'Painel comparativo das variantes conceituais da identidade visual para validação da Issue #442.',
    robots: {
        index: false,
        follow: false,
    },
};

export default function BrandPreviewPage() {
    return (
        <main className="min-h-screen py-10 md:py-16">
            <PageContainer>
                <BrandPreviewClient />
            </PageContainer>
        </main>
    );
}
