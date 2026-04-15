import type { ReactNode, HTMLAttributes } from 'react';

export interface TableContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  caption?: string;
}

export function TableContainer({
  children,
  caption,
  className = '',
  ...props
}: TableContainerProps) {
  return (
    <div
      className={[
        'rounded-[var(--mvp-radius-md)] border border-[hsl(var(--mvp-border))]',
        'overflow-hidden',
        className,
      ].join(' ')}
      {...props}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-label={caption}>
          {caption && <caption className="sr-only">{caption}</caption>}
          {children}
        </table>
      </div>
    </div>
  );
}

export function Th({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={[
        'h-9 px-4 text-left text-[11px] font-semibold uppercase tracking-wider',
        'text-[hsl(var(--mvp-text-3))] bg-[hsl(var(--mvp-surface-0))]',
        'border-b border-[hsl(var(--mvp-border))] whitespace-nowrap',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={[
        'h-12 px-4',
        'text-[hsl(var(--mvp-text-2))]',
        'border-b border-[hsl(var(--mvp-border))] last:border-b-0',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </td>
  );
}

export function TBody({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={['divide-y divide-[hsl(var(--mvp-border))]', className].join(' ')}
      {...props}
    >
      {children}
    </tbody>
  );
}
