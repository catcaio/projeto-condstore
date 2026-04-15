import type { SelectHTMLAttributes } from 'react';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helpText?: string;
  placeholder?: string;
}

export function Select({
  label,
  error,
  helpText,
  placeholder,
  children,
  className = '',
  id,
  ...props
}: SelectProps) {
  const selectId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-medium text-[hsl(var(--mvp-text-2))] tracking-tight"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={[
            'w-full h-9 rounded-[var(--mvp-radius-xs)] text-sm appearance-none pr-8 pl-3',
            'bg-[hsl(var(--mvp-surface-1))] text-[hsl(var(--mvp-text-1))]',
            'border border-[hsl(var(--mvp-border))]',
            'transition-colors duration-100',
            'focus:outline-none focus:ring-1 focus:ring-[hsl(var(--mvp-accent))] focus:border-[hsl(var(--mvp-accent))]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error ? 'border-[hsl(var(--mvp-danger))] focus:ring-[hsl(var(--mvp-danger))]' : '',
            className,
          ].join(' ')}
          aria-invalid={!!error}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {children}
        </select>
        {/* Chevron icon */}
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[hsl(var(--mvp-text-3))]">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
      {error && (
        <p className="text-xs text-[hsl(var(--mvp-danger))]" role="alert">
          {error}
        </p>
      )}
      {!error && helpText && (
        <p className="text-xs text-[hsl(var(--mvp-text-3))]">{helpText}</p>
      )}
    </div>
  );
}
