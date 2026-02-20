"use client";

import { useState } from "react";
import { GroupedSection, SectionDivider } from "@/components/ui/GroupedSection";
import { ValueRow } from "@/components/ui/ValueRow";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "condstore:theme";

function applyTheme(theme: Theme) {
  if (theme === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
  try {
    if (theme === "system") {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, theme);
    }
  } catch {
    // ignore storage errors
  }
}

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" },
  { value: "system", label: "Sistema" },
];

/**
 * Seção de aparência (seleção de tema claro/escuro/sistema).
 * Componente cliente para gerenciar o tema do OS.
 */
export function ThemeToggleSection() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (saved === "light" || saved === "dark") return saved;
    } catch {
      // ignore storage errors
    }
    return "system";
  });

  const handleSelect = (next: Theme) => {
    setTheme(next);
    applyTheme(next);
  };

  const currentLabel =
    THEME_OPTIONS.find(o => o.value === theme)?.label ?? "Sistema";

  return (
    <GroupedSection
      title="Aparência"
      footer="'Sistema' segue as preferências do seu dispositivo."
    >
      {THEME_OPTIONS.map((option, idx) => (
        <span key={option.value}>
          {idx > 0 && <SectionDivider />}
          <button
            type="button"
            aria-label={`Tema: ${option.label}`}
            onClick={() => handleSelect(option.value)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              minHeight: "var(--os-row-height)",
              padding: "10px var(--os-row-padding)",
              background: "transparent",
              border: "none",
              width: "100%",
              fontFamily: "inherit",
              fontSize: "var(--os-font-body)",
              cursor: "pointer",
              color: "var(--os-text)",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <span>{option.label}</span>
            {theme === option.value && (
              <svg
                width={18}
                height={18}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
                style={{ color: "var(--os-accent)" }}
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
        </span>
      ))}
      <SectionDivider />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: "var(--os-row-height)",
          padding: "10px var(--os-row-padding)",
          pointerEvents: "none",
          opacity: 0,
          height: 0,
          overflow: "hidden",
        }}
        aria-hidden
      >
        {/* placeholder para manter o tipo inferido */}
        <ValueRow label="Atual" value={currentLabel} chevron={false} />
      </div>
    </GroupedSection>
  );
}
