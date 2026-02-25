import * as React from 'react';
import { cn } from '@/lib/utils';

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { className, label, hint, error, id, ...props },
  ref,
) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className="space-y-1.5">
      {label ? (
        <label htmlFor={inputId} className="block text-sm font-medium text-[hsl(var(--ui-text))]">
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        ref={ref}
        className={cn(
          'h-10 w-full rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface-elevated))] px-3 text-sm text-[hsl(var(--ui-text))] placeholder:text-[hsl(var(--ui-text-subtle))]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:border-[hsl(var(--ring))]',
          error && 'border-[hsl(var(--ui-danger)/0.65)] focus-visible:ring-[hsl(var(--ui-danger))] focus-visible:border-[hsl(var(--ui-danger))]',
          className,
        )}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        {...props}
      />
      {error ? (
        <p id={errorId} className="text-xs text-[hsl(var(--ui-danger-ink))]">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-[hsl(var(--ui-text-muted))]">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
