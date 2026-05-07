import type { Metadata } from 'next';
import { FaqSection } from '@/ui/site/faq-section';
import { CTASection } from '@/ui/site/cta-section';

export const metadata: Metadata = {
    title: 'FAQ — Condstore OS',
    description: 'Respostas para as principais dúvidas sobre o Condstore OS, integração com ERP, WhatsApp CRM e logística operacional.',
};

export default function FAQPage() {
    return (
        <>
            <FaqSection />

            <CTASection
                title="Ainda tem dúvidas?"
                subtitle="Nossa equipe está pronta para explicar como o Condstore OS se adapta à sua operação."
                ctas={[
                    { label: 'Solicitar avaliação operacional', href: '/piloto' },
                    { label: 'Entrar em contato', href: '/contato', variant: 'secondary' },
                ]}
            />
        </>
    );
}
