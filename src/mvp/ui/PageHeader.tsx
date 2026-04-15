import type { ReactNode } from 'react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumb?: { label: string; href?: string }[];
  actions?: ReactNode;
  badge?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  breadcrumb,
  actions,
  badge,
  className = '',
}: PageHeaderProps) {
  return (
    <header
      className={[
        'flex flex-col gap-3 pb-5 border-b border-[hsl(var(--mvp-border))]',
        className,
      ].join(' ')}
    >
      {breadcrumb && breadcrumb.length > 0 && (
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5">
            {breadcrumb.map((item, idx) => (
              <li key={idx} className="flex items-center gap-1.5">
                {idx > 0 && (
                  <span className="text-[hsl(var(--mvp-text-3))] text-xs" aria-hidden="true">
                    /
                  </span>
                )}
                {item.href ? (
                  <a
                    href={item.href}
                    className="text-xs text-[hsl(var(--mvp-text-3))] hover:text-[hsl(var(--mvp-text-1))] transition-colors"
                  >
                    {item.label}
                  </a>
                ) : (
                  <span className="text-xs text-[hsl(var(--mvp-text-2))] font-medium">
                    {item.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-semibold text-[hsl(var(--mvp-text-1))] leading-tight">
              {title}
            </h1>
            {badge}
          </div>
          {subtitle && (
            <p className="text-sm text-[hsl(var(--mvp-text-3))]">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0 pt-0.5">{actions}</div>
        )}
      </div>
    </header>
  );
}
