import type { ReactNode, CSSProperties } from "react";

interface IconProps {
  children: ReactNode;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: CSSProperties;
  className?: string;
  "aria-hidden"?: boolean;
}

/**
 * Wrapper para SVGs inline do Condstore OS.
 * Garante stroke-width consistente em todos os ícones outline.
 */
export function Icon({
  children,
  size = 20,
  color = "currentColor",
  strokeWidth = 1.5,
  style,
  className,
  "aria-hidden": ariaHidden = true,
}: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={ariaHidden}
      style={style}
      className={className}
    >
      {children}
    </svg>
  );
}
