"use client";

import { useState } from "react";
import type { ReactNode } from "react";

interface ToggleRowProps {
  label: string;
  icon?: ReactNode;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  "aria-label"?: string;
}

/**
 * Linha com toggle estilo iOS.
 * Componente cliente para gerenciar estado local.
 * Para persistência real, passe onChange e controle externamente.
 */
export function ToggleRow({
  label,
  icon,
  defaultChecked = false,
  onChange,
  "aria-label": ariaLabel,
}: ToggleRowProps) {
  const [checked, setChecked] = useState(defaultChecked);

  const handleChange = (next: boolean) => {
    setChecked(next);
    onChange?.(next);
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        minHeight: "var(--os-row-height)",
        padding: "10px var(--os-row-padding)",
      }}
    >
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
          fontSize: "var(--os-font-body)",
          fontWeight: 400,
        }}
      >
        {label}
      </span>

      {/* Toggle iOS */}
      <label
        className="os-toggle"
        aria-label={ariaLabel ?? label}
        title={ariaLabel ?? label}
      >
        <input
          type="checkbox"
          role="switch"
          aria-checked={checked}
          checked={checked}
          onChange={e => handleChange(e.target.checked)}
        />
        <span className="os-toggle-track" />
        <span className="os-toggle-thumb" />
      </label>
    </div>
  );
}
