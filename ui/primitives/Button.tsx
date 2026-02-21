import * as React from "react"
import { Pressable, PressableProps } from "./Pressable"

export interface ButtonProps extends PressableProps {
    variant?: "primary" | "secondary"
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", children, disabled, ...props }, ref) => {
        const baseClasses = "h-[56px] rounded-[var(--radius-pill)] w-full flex items-center justify-center font-medium text-[var(--text-base)] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-blue)] focus-visible:outline-offset-2"

        const variantClasses = variant === "primary"
            ? "bg-[var(--brand-blue)] text-white"
            : "bg-[var(--surface-muted)] text-[var(--text-body)]"

        return (
            <Pressable
                ref={ref}
                disabled={disabled}
                className={`${baseClasses} ${variantClasses} ${className || ""}`.trim()}
                {...props}
            >
                {children}
            </Pressable>
        )
    }
)
Button.displayName = "Button"
