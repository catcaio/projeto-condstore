import type { ReactNode } from "react";

interface GroupedSectionProps {
  title?: string;
  footer?: string;
  children: ReactNode;
}

/**
 * Seção agrupada do Condstore OS, estilo iOS Settings.
 * Exibe um título (uppercase), card de superfície com divisores
 * entre filhos, e rodapé opcional.
 */
export function GroupedSection({ title, footer, children }: GroupedSectionProps) {
  return (
    <section style={{ marginBottom: "var(--os-section-gap)" }}>
      {title && (
        <p
          style={{
            fontSize: "var(--os-font-footnote)",
            fontWeight: 400,
            color: "var(--os-text2)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            marginBottom: 8,
            padding: "0 var(--os-row-padding)",
          }}
        >
          {title}
        </p>
      )}

      <div
        style={{
          background: "var(--os-surface)",
          borderRadius: "var(--os-radius-lg)",
          overflow: "hidden",
        }}
      >
        {children}
      </div>

      {footer && (
        <p
          style={{
            fontSize: "var(--os-font-footnote)",
            color: "var(--os-text2)",
            marginTop: 8,
            padding: "0 var(--os-row-padding)",
            lineHeight: 1.4,
          }}
        >
          {footer}
        </p>
      )}
    </section>
  );
}

/**
 * Divisor interno entre linhas de uma GroupedSection.
 * Deve ser inserido entre filhos pelo componente pai ou diretamente.
 */
export function SectionDivider() {
  return (
    <div
      aria-hidden
      style={{
        height: "1px",
        background: "var(--os-line)",
        marginLeft: "var(--os-row-padding)",
      }}
    />
  );
}
