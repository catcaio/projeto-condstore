import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/ui/shell/app-shell";
import "../../styles/tokens.css";

export const metadata = {
  title: "CONDSTORE OS",
};

/**
 * Layout do Condstore OS Logado (grupo de rotas app).
 *
 * Responsabilidades:
 * - Proteger rotas filhas garantindo tenantId (redireciona p/ login).
 * - Envolver conteúdo no novo AppShell.
 * - Injetar CSS tokens base.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const headersList = await headers();
  const tenantId = headersList.get("x-auth-tenant-id");
  const role = headersList.get("x-auth-role") || "viewer";

  // Guard: if not authenticated, redirect to login
  if (!tenantId) {
    redirect("/login");
  }

  const themeScript = `(function(){try{var t=localStorage.getItem('condstore:theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      <AppShell role={role} tenantId={tenantId}>
        {children}
      </AppShell>
    </>
  );
}
