import type { InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helpText?: string;
  error?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}

export function Input({
  label,
  helpText,
  error,
  leading,
  trailing,
  className = '',
  id,
  ...props
}: InputProps) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-[hsl(var(--mvp-text-2))] tracking-tight"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leading && (
          <span className="absolute left-2.5 text-[hsl(var(--mvp-text-3))] pointer-events-none flex items-center">
            {leading}
          </span>
        )}
        <input
          id={inputId}
          className={[
            'w-full h-9 rounded-[var(--mvp-radius-xs)] text-sm',
            'bg-[hsl(var(--mvp-surface-1))] text-[hsl(var(--mvp-text-1))]',
            'border border-[hsl(var(--mvp-border))]',
            'placeholder:text-[hsl(var(--mvp-text-3))]',
            'transition-colors duration-100',
            'focus:outline-none focus:ring-1 focus:ring-[hsl(var(--mvp-accent))] focus:border-[hsl(var(--mvp-accent))]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error ? 'border-[hsl(var(--mvp-danger))] focus:ring-[hsl(var(--mvp-danger))]' : '',
            leading ? 'pl-8' : 'px-3',
            trailing ? 'pr-8' : 'px-3',
            className,
          ].join(' ')}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${inputId}-error` : helpText ? `${inputId}-help` : undefined
          }
          {...props}
        />
        {trailing && (
          <span className="absolute right-2.5 text-[hsl(var(--mvp-text-3))] pointer-events-none flex items-center">
            {trailing}
          </span>
        )}
      </div>
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-[hsl(var(--mvp-danger))]" role="alert">
          {error}
        </p>
      )}
      {!error && helpText && (
        <p id={`${inputId}-help`} className="text-xs text-[hsl(var(--mvp-text-3))]">
          {helpText}
        </p>
      )}
    </div>
  );
}
