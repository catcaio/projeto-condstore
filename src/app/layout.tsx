import type { Metadata } from 'next';
import './globals.css';
import { SentryClientBootstrap } from './_sentry-client-bootstrap';
import { ThemeProvider, ThemeScript } from '@/ui/theme';

export const metadata: Metadata = {
    title: 'Painel Logístico - LojaCond',
    description: 'Simulação e gerenciamento de fretes',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="pt-BR" suppressHydrationWarning data-theme="light">
            <body className="min-h-screen bg-background text-foreground antialiased [font-family:-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Segoe_UI',sans-serif]">
                <ThemeScript />
                <ThemeProvider>
                    <SentryClientBootstrap />
                    <div className="min-h-screen bg-background">
                        {children}
                    </div>
                </ThemeProvider>
            </body>
        </html>
    );
}
