import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

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
            <body className={inter.className}>
                <div className="min-h-screen bg-background">
                    {children}
                </div>
            </body>
        </html>
    );
}
