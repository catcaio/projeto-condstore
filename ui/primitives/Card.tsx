import * as React from "react"

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "recommended"
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className, variant = "default", children, ...props }, ref) => {
        const isRecommended = variant === "recommended"
        const baseClasses = "rounded-[var(--radius-card)] p-[24px] bg-[var(--surface-elevated)] border border-[var(--surface-muted)] transition-transform duration-[var(--motion-base)]"
        const recommendedClasses = isRecommended
            ? "scale-[1.02] shadow-[var(--shadow-recommended)] !border-[var(--brand-blue)]"
            : ""

        return (
            <div
                ref={ref}
                className={`${baseClasses} ${recommendedClasses} ${className || ""}`.trim()}
                {...props}
            >
                {children}
            </div>
        )
    }
)
Card.displayName = "Card"
