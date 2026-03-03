import Link from 'next/link';
import Image from 'next/image';

export function BrandHeader() {
    return (
        <header className="sticky top-0 z-50 w-full bg-zinc-50/80 backdrop-blur-md border-b border-zinc-100 transition-colors duration-300">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                <Link
                    href="/"
                    aria-label="CONDSTORE OS - Início"
                    className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--condstore-blue-500] focus-visible:ring-offset-2 flex items-center gap-3 transition-opacity hover:opacity-90"
                >
                    {/* Mobile Display: Mark (28px) + Text (no tagline) */}
                    <div className="flex sm:hidden items-center gap-2.5">
                        <Image
                            src="/brand/condstoreos-mark.svg"
                            alt="CONDSTORE OSS Logo Mark"
                            width={28}
                            height={28}
                            className="h-7 w-auto"
                            priority
                        />
                        <span className="font-extrabold text-[#0E2433] text-lg tracking-tight">
                            CONDSTORE<span className="font-normal text-[#3B88A8] ml-1">OS</span>
                        </span>
                    </div>

                    {/* Desktop Display: Full Lockup SVG (40px) */}
                    <Image
                        src="/brand/condstoreos-logo-lockup.svg"
                        alt="CONDSTORE OS Logo Lockup"
                        width={240}
                        height={40}
                        className="hidden sm:block h-10 w-auto"
                        priority
                    />
                </Link>

                {/* Espaço futuro para ação direita */}
                <div className="flex items-center gap-4">
                    {/* Placeholder elements for future actions (e.g., login, menu) */}
                </div>
            </div>
        </header>
    );
}
