import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ApplicationTracker } from "@/ui/lib/app-tracker-client";
import { User, LogOut, MapPin } from "lucide-react";
import "@/styles/tokens.css";

export const metadata = {
    title: "Técnico — CONDSTORE OS",
};

export default async function FieldLayout({ children }: { children: ReactNode }) {
    const headersList = await headers();
    const tenantId = headersList.get("x-auth-tenant-id");
    const role = headersList.get("x-auth-role") || "viewer";

    // Guard: if not authenticated or not a technical/field role, redirect
    // Para fins fáceis, mantemos proteção similar, o proxy protege `/tech`
    if (!tenantId) {
        redirect("/login");
    }

    const themeScript = `(function(){try{var t=localStorage.getItem('condstore:theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

    return (
        <>
            <script dangerouslySetInnerHTML={{ __html: themeScript }} />
            <div className="os-root min-h-screen bg-[hsl(var(--ui-bg))] text-[hsl(var(--ui-text))] flex flex-col">
                {/* Field execution small header */}
                <header className="h-14 border-b border-[hsl(var(--ui-border))] px-4 flex items-center justify-between bg-[hsl(var(--ui-surface))] sticky top-0 z-10 w-full shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[hsl(var(--ui-accent-blue)/0.12)] text-[hsl(var(--ui-accent-blue))] flex items-center justify-center">
                            <User className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold leading-none">Técnico Operacional</span>
                            <span className="text-[10px] text-[hsl(var(--ui-text-muted))] uppercase tracking-wider">
                                Execução
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold px-2 py-1 rounded bg-[hsl(var(--ui-success)/0.1)] text-[hsl(var(--ui-success))]">
                            <MapPin className="h-3 w-3" /> Em rota
                        </div>

                        <a href="/api/auth/logout" className="flex items-center gap-2 text-xs font-medium text-[hsl(var(--ui-text-muted))] hover:text-[hsl(var(--ui-danger))] transition-colors">
                            <span className="hidden sm:inline">Sair</span>
                            <LogOut className="h-4 w-4" />
                        </a>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto w-full">
                    <ApplicationTracker />
                    {children}
                </main>
            </div>
        </>
    );
}
