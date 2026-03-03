import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[hsl(var(--ui-page))] px-4 py-12 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col items-center">
                <Link href="/" aria-label="Voltar para a página inicial" className="transition-opacity hover:opacity-90">
                    <Image
                        src="/brand/condstoreos-logo-lockup.svg"
                        alt="CONDSTORE OS Logo"
                        width={240}
                        height={40}
                        className="h-10 w-auto"
                        priority
                    />
                </Link>
            </div>

            {/* The individual login forms or selection screens will go here */}
            {children}

            <div className="mt-8 text-center text-xs text-[hsl(var(--ui-text-muted))]">
                &copy; {new Date().getFullYear()} CONDSTORE OS. Todos os direitos reservados.
            </div>
        </div>
    );
}
