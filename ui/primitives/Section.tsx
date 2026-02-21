import * as React from "react"

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
    variant?: "default" | "muted"
}

export const Section = React.forwardRef<HTMLElement, SectionProps>(
    ({ className, variant = "default", children, ...props }, ref) => {
        const bgClass = variant === "muted" ? "bg-[var(--surface-muted)]" : "bg-transparent"

        return (
            <section
                ref={ref}
                className={`py-[var(--space-8)] px-[clamp(16px,6vw,24px)] ${bgClass} ${className || ""}`.trim()}
                {...props}
            >
                {children}
            </section>
        )
    }
)
Section.displayName = "Section"
