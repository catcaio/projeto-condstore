import Sidebar from './_components/sidebar';
import CommandBar from './_components/command-bar';

export default function CockpitLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="cockpit-theme min-h-screen bg-[hsl(var(--cockpit-bg))] text-[hsl(var(--cockpit-text))] flex font-sans antialiased text-sm">
            {/* Sidebar - Fixed */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex-1 ml-64 flex flex-col min-h-screen">
                {/* Top Command Bar - Sticky */}
                <CommandBar />

                {/* Dynamic Page Content */}
                <main className="flex-1 p-6 relative">
                    <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_right,#80808005_1px,transparent_1px),linear-gradient(to_bottom,#80808005_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                    <div className="relative z-0 max-w-7xl mx-auto">{children}</div>
                </main>
            </div>
        </div>
    );
}
