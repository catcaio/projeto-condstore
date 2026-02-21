import * as React from "react"

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
    space?: 8 | 16 | 24 | 32 | 48 | 64
}

export const Stack = React.forwardRef<HTMLDivElement, StackProps>(
    ({ className, space = 16, children, ...props }, ref) => {
        // Map space to standard token values
        const spaceMap = {
            8: "gap-[var(--space-1)]",
            16: "gap-[var(--space-2)]",
            24: "gap-[var(--space-3)]",
            32: "gap-[var(--space-4)]",
            48: "gap-[var(--space-6)]",
            64: "gap-[var(--space-8)]",
        }

        return (
            <div
                ref={ref}
                className={`flex flex-col ${spaceMap[space]} ${className || ""}`.trim()}
                {...props}
            >
                {children}
            </div>
        )
    }
)
Stack.displayName = "Stack"
