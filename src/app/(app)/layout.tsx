import type { ReactNode } from "react";
import "../../styles/tokens.css";

export const metadata = {
  title: "Configurações — Condstore OS",
};

/**
 * Layout do Condstore OS (grupo de rotas).
 *
 * Responsabilidades:
 * - Importar os tokens CSS do OS (--os-*)
 * - Injetar ThemeScript inline (evita flash de tema incorreto)
 * - Envolver o conteúdo no .os-root para tipografia e background
 *
 * O ThemeScript lê localStorage('condstore:theme') de forma síncrona
 * e aplica data-theme no <html> antes do primeiro paint.
 */
export default function CockpitOSLayout({ children }: { children: ReactNode }) {
  const themeScript = `(function(){try{var t=localStorage.getItem('condstore:theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

  return (
    <>
      {/* ThemeScript: síncrono, sem defer, sem async — aplicado antes do paint */}
      {/* eslint-disable-next-line react/no-danger */}
      <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      <div className="os-root">{children}</div>
    </>
  );
}
