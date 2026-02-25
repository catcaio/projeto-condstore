import Sidebar from './_components/sidebar';
import CommandBar from './_components/command-bar';

export default function CockpitLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="cockpit-theme min-h-screen bg-[hsl(var(--cockpit-bg))] text-[hsl(var(--cockpit-text))]">
            <div className="mx-auto max-w-[1440px] px-3 pb-8 pt-3 sm:px-4">
                <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
                    <Sidebar />

                    <div className="min-w-0 space-y-4">
                        <CommandBar />

                        <main className="min-w-0">
                            <div className="mx-auto max-w-6xl">{children}</div>
                        </main>
                    </div>
                </div>
            </div>
        </div>
    );
}
