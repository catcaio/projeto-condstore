import type { ReactNode } from "react";

interface TopBarProps {
  title: string;
  leftAction?: ReactNode;
  rightAction?: ReactNode;
}

/**
 * Barra superior do Condstore OS.
 * Inspirada na TopBar do app Configurações do iOS:
 * - Ação à esquerda (voltar / fechar)
 * - Título centralizado
 * - Ação à direita (info / ação secundária)
 */
export function TopBar({ title, leftAction, rightAction }: TopBarProps) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: "var(--os-row-height)",
        padding: "0 var(--os-row-padding)",
        background: "var(--os-surface)",
        borderBottom: "1px solid var(--os-line)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      <div style={{ minWidth: 44, display: "flex", alignItems: "center" }}>
        {leftAction}
      </div>

      <span
        style={{
          fontWeight: 600,
          fontSize: "var(--os-font-body)",
          color: "var(--os-text)",
          flex: 1,
          textAlign: "center",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          padding: "0 8px",
        }}
      >
        {title}
      </span>

      <div
        style={{
          minWidth: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
        }}
      >
        {rightAction}
      </div>
    </header>
  );
}
