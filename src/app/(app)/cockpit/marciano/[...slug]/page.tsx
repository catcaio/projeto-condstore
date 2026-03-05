import { cookies } from 'next/headers';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { CinematicShelves } from './CinematicShelves.client';

export default async function MarcianoPlaceholderPage(props: { params: Promise<{ slug: string[] }>; searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const params = await props.params;
    const searchParams = await props.searchParams;

    // Evaluate TV mode
    const cookieStore = await cookies();
    const tvModeCookie = cookieStore.get('cs_tv');
    const isTvMode = searchParams.tv === '1' || tvModeCookie?.value === '1';

    // Parse sector
    const rawSlug = params.slug[0] || 'geral';
    const sectorName = rawSlug.charAt(0).toUpperCase() + rawSlug.slice(1);

    return (
        <main className={cn(
            "flex-1 overflow-y-auto bg-[hsl(var(--ui-background))]",
            isTvMode ? "p-6 sm:p-10" : "p-4 sm:p-6 lg:p-8"
        )}>
            <div className={cn(
                "mx-auto flex flex-col w-full transition-all duration-300",
                isTvMode ? "max-w-[1920px] gap-8" : "max-w-6xl gap-6"
            )}>
                {/* Header Section */}
                <header className="flex flex-col gap-4">
                    <Link href="/cockpit" className="group inline-flex items-center text-sm font-medium text-[hsl(var(--ui-text-muted))] hover:text-[hsl(var(--ui-text))] transition-colors w-fit">
                        <ChevronLeft className="mr-1 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                        Voltar ao Cockpit
                    </Link>
                    <div>
                        <h1 className={cn(
                            "font-bold text-[hsl(var(--ui-text))] tracking-tight flex items-center gap-3",
                            isTvMode ? "text-3xl sm:text-5xl" : "text-2xl sm:text-3xl"
                        )}>
                            Setor: {sectorName}
                            <span className="inline-flex items-center rounded-md border border-[hsl(var(--ui-accent-blue)/0.2)] bg-[hsl(var(--ui-accent-blue)/0.1)] px-2.5 py-0.5 text-xs font-semibold tracking-wide text-[hsl(var(--ui-accent-blue))]">
                                Preview
                            </span>
                        </h1>
                        <p className={cn(
                            "text-[hsl(var(--ui-text-muted))]",
                            isTvMode ? "text-lg mt-2" : "text-sm mt-1"
                        )}>
                            Dashboard de amostra focado em usabilidade e TV-first. (Em Breve)
                        </p>
                    </div>
                </header>

                {/* Cinematic Netflix-style Shelves */}
                <CinematicShelves isTvMode={isTvMode} />
            </div>
        </main>
    );
}
