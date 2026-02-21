import * as React from "react"
import { Button } from "@/ui/primitives/Button"

export interface StickyCTAProps {
    buttonLabel?: string;
    onPress?: () => void;
    disabled?: boolean;
}

export const StickyCTA = ({ buttonLabel = "Selecionar plano", onPress, disabled }: StickyCTAProps) => {
    return (
        <div className="sticky-bottom-safe border-t border-[var(--surface-muted)] px-[clamp(16px,6vw,24px)] pt-4 pb-[env(safe-area-inset-bottom,16px)] drop-shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
            <Button
                variant="primary"
                onClick={onPress}
                disabled={disabled}
            >
                {buttonLabel}
            </Button>
        </div>
    )
}
