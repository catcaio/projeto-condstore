// EXPERIMENTAL CONCEPT LAYER — não remover sem validação estratégica
import React from 'react';

export function FractalBackground() {
    return (
        <div
            className="pointer-events-none absolute inset-0 overflow-hidden z-0 flex items-center justify-center opacity-[0.05] will-change-auto"
            aria-hidden="true"
        >
            <svg
                className="text-current"
                style={{ width: '200vw', height: '200vh' }}
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
            >
                <defs>
                    <pattern
                        id="fractal-pattern"
                        x="0"
                        y="0"
                        width="80"
                        height="80"
                        patternUnits="userSpaceOnUse"
                    >
                        <path
                            d="M40 10 L70 40 L40 70 L10 40 Z"
                            stroke="currentColor"
                            strokeWidth="0.5"
                            fill="none"
                        />
                        <circle cx="40" cy="40" r="12" stroke="currentColor" strokeWidth="0.5" fill="none" />
                        <circle cx="40" cy="40" r="2" fill="currentColor" />
                        <path d="M10 40 H28 M52 40 H70 M40 10 V28 M40 52 V70" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#fractal-pattern)" />
            </svg>
        </div>
    );
}
