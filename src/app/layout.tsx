import type { Metadata } from 'next';
import './globals.css';

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
        <html lang="pt-BR">
            <body style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                <div className="min-h-screen bg-background">
                    {children}
                </div>
            </body>
        </html>
    );
}
