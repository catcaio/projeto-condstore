import * as React from "react"

export interface PressableProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { }

export const Pressable = React.forwardRef<HTMLButtonElement, PressableProps>(
    ({ className, children, ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={`active:scale-[0.98] transition-transform duration-[var(--motion-base)] motion-reduce:transition-none motion-reduce:transform-none cursor-pointer appearance-none bg-transparent p-0 text-left border-none ${className || ""}`.trim()}
                {...props}
            >
                {children}
            </button>
        )
    }
)
Pressable.displayName = "Pressable"
