import type { ReactNode } from "react";

interface SettingsRowProps {
  label: string;
  icon?: ReactNode;
  rightValue?: string;
  chevron?: boolean;
  href?: string;
  onClick?: () => void;
  "aria-label"?: string;
}

const ChevronRight = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
);

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  minHeight: "var(--os-row-height)",
  padding: "10px var(--os-row-padding)",
  textDecoration: "none",
  color: "inherit",
  cursor: "pointer",
  background: "transparent",
  border: "none",
  width: "100%",
  textAlign: "left",
  fontFamily: "inherit",
  fontSize: "var(--os-font-body)",
  WebkitTapHighlightColor: "transparent",
};

/**
 * Linha padrão de configurações.
 * Suporta ícone à esquerda, label, valor à direita e chevron.
 * Renderiza como <a> se href for passado, ou <button> se onClick.
 */
export function SettingsRow({
  label,
  icon,
  rightValue,
  chevron = true,
  href,
  onClick,
  "aria-label": ariaLabel,
}: SettingsRowProps) {
  const inner = (
    <>
      {icon && (
        <span
          style={{
            display: "flex",
            alignItems: "center",
            color: "var(--os-accent)",
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
      )}

      <span
        style={{
          flex: 1,
          color: "var(--os-text)",
          fontWeight: 400,
        }}
      >
        {label}
      </span>

      {rightValue && (
        <span
          style={{
            color: "var(--os-text2)",
            fontSize: "var(--os-font-body)",
            marginRight: chevron ? 4 : 0,
          }}
        >
          {rightValue}
        </span>
      )}

      {chevron && (
        <span style={{ color: "var(--os-text2)", display: "flex" }}>
          <ChevronRight />
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <a href={href} style={rowStyle} aria-label={ariaLabel ?? label}>
        {inner}
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
      {inner}
    </button>
  );
}
