import * as React from "react"
import { Button } from "../../ui/primitives/Button"

export interface StickyCTAProps {
    buttonLabel?: string;
    onPress?: () => void;
    disabled?: boolean;
    hasScrolled?: boolean;
}

export const StickyCTA = ({ buttonLabel = "Selecionar plano", onPress, disabled, hasScrolled }: StickyCTAProps) => {
    return (
        <div className={`sticky-bottom-safe border-t px-[clamp(16px,6vw,24px)] pt-4 pb-[env(safe-area-inset-bottom,16px)] transition-all duration-[var(--motion-base)] ${hasScrolled ? 'drop-shadow-[0_-8px_16px_rgba(0,0,0,0.06)] border-transparent' : 'drop-shadow-none border-[var(--surface-muted)]'}`}>
            <Button
                variant="primary"
                onClick={onPress}
                disabled={disabled}
                aria-label={buttonLabel}
            >
                {buttonLabel}
            </Button>
        </div>
    )
}
