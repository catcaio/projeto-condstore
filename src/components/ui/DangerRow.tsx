interface DangerRowProps {
  label: string;
  onClick?: () => void;
  href?: string;
  "aria-label"?: string;
}

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "var(--os-row-height)",
  padding: "10px var(--os-row-padding)",
  textDecoration: "none",
  color: "var(--os-danger)",
  cursor: "pointer",
  background: "transparent",
  border: "none",
  width: "100%",
  textAlign: "center",
  fontFamily: "inherit",
  fontSize: "var(--os-font-body)",
  fontWeight: 400,
  WebkitTapHighlightColor: "transparent",
};

/**
 * Linha destrutiva do Condstore OS.
 * Label centralizado em --os-danger (vermelho).
 * Usa-se para ações irreversíveis (sair, excluir, etc.).
 */
export function DangerRow({
  label,
  onClick,
  href,
  "aria-label": ariaLabel,
}: DangerRowProps) {
  if (href) {
    return (
      <a href={href} style={rowStyle} aria-label={ariaLabel ?? label}>
        {label}
      </a>
    );
  }

  return (
    <button
      type="button"
      style={rowStyle}
      onClick={onClick}
      aria-label={ariaLabel ?? label}
    >
      {label}
    </button>
  );
}
