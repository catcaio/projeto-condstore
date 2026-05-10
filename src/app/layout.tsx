import type { Metadata } from 'next';
import './globals.css';
import '../styles/tokens.typography.css';
import '../styles/tokens.light.css';
import '../styles/tokens.dark.css';
import '../styles/tokens.semantic.css';
import { SentryClientBootstrap } from './_sentry-client-bootstrap';
import { ThemeProvider, ThemeScript } from '@/ui/theme';
import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata: Metadata = {
    title: {
        template: '%s | CONDSTORE OS',
        default: 'CONDSTORE OS - Automatize o frete da sua loja',
    },
    description: 'Cotações inteligentes, múltiplas transportadoras e automação via WhatsApp em minutos.',
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://condstore.io'),
    alternates: {
        canonical: '/',
    },
    openGraph: {
        title: 'CONDSTORE OS - Automatize o frete da sua loja',
        description: 'Plataforma completa de automação e gestão de fretes.',
        url: '/',
        siteName: 'CONDSTORE OS',
        locale: 'pt_BR',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'CONDSTORE OS',
        description: 'Cotações inteligentes, automação e logística ágil.',
    },
    icons: {
        icon: '/favicon.ico',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="pt-BR" suppressHydrationWarning data-theme="light">
            <body className="min-h-screen antialiased">
                <ThemeScript />
                <ThemeProvider>
                    <SentryClientBootstrap />
                    <div className="min-h-screen">
                        {children}
                    </div>
                </ThemeProvider>
                <SpeedInsights />
            </body>
        </html>
    );
}
