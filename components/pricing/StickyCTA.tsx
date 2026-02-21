import * as React from "react"
import { Button } from "../../ui/primitives/Button"

export interface StickyCTAProps {
    buttonLabel?: string;
    onPress?: () => void;
    disabled?: boolean;
    hasScrolled?: boolean;
    loading?: boolean;
}

export const StickyCTA = ({ buttonLabel = "Selecionar plano", onPress, disabled, hasScrolled, loading }: StickyCTAProps) => {
    return (
        <div className={`sticky-bottom-safe border-t px-[clamp(16px,6vw,24px)] pt-4 pb-[env(safe-area-inset-bottom,16px)] transition-all duration-[var(--motion-base)] ${hasScrolled ? 'drop-shadow-[0_-8px_16px_rgba(0,0,0,0.06)] border-transparent' : 'drop-shadow-none border-[var(--surface-muted)]'}`}>
            <Button
                variant="primary"
                onClick={onPress}
                disabled={disabled || loading}
                aria-label={buttonLabel}
                className="relative"
            >
                <span className={`transition-opacity ${loading ? 'opacity-0' : 'opacity-100'}`}>
                    {buttonLabel}
                </span>
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                )}
            </Button>
        </div>
    )
}
