"use client";

import { LucideIcon } from "lucide-react";
import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

export type Accent =
  | "blue"
  | "green"
  | "amber"
  | "emerald"
  | "violet"
  | "red"
  | "orange"
  | "pink"
  | "neutral";

const ACCENT_VAR: Record<Accent, string> = {
  blue: "--series-1",
  emerald: "--series-2",
  amber: "--series-3",
  green: "--series-4",
  violet: "--series-5",
  red: "--series-6",
  pink: "--series-7",
  orange: "--series-8",
  neutral: "--text-primary",
};

export function accentColor(a: Accent): string {
  return `var(${ACCENT_VAR[a]})`;
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-7 flex items-end justify-between gap-4 border-b pb-5">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
            {subtitle}
          </p>
        )}
      </div>
      {actions}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-[var(--surface)] p-5 transition-colors hover:border-[var(--border-strong)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-secondary)]">
      {children}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  suffix,
  hint,
  accent = "neutral",
  icon: Icon,
  onClick,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  hint?: string;
  accent?: Accent;
  icon?: LucideIcon;
  onClick?: () => void;
}) {
  const color = accentColor(accent);
  const clickable = onClick !== undefined;
  return (
    <div
      className={cn(
        "rounded-xl border bg-[var(--surface)] p-5 transition-colors hover:border-[var(--border-strong)]",
        clickable && "cursor-pointer hover:bg-[var(--surface-2)]/40",
      )}
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-[0.1em] text-[var(--text-secondary)]">
          {label}
        </div>
        {Icon && (
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{
              background:
                accent === "neutral"
                  ? "var(--surface-2)"
                  : `color-mix(in srgb, ${color} 12%, transparent)`,
            }}
          >
            <Icon
              className="h-[18px] w-[18px]"
              style={{ color: accent === "neutral" ? "var(--text-muted)" : color }}
            />
          </span>
        )}
      </div>
      <div
        className="mt-3 text-[40px] font-semibold leading-none tracking-[-0.03em] tabular-nums"
        style={{ color }}
      >
        {value}
        {suffix && (
          <span className="ml-1 text-xl font-medium text-[var(--text-muted)]">
            {suffix}
          </span>
        )}
      </div>
      {hint && (
        <div className="mt-2 text-xs text-[var(--text-muted)]">{hint}</div>
      )}
    </div>
  );
}

export function Badge({
  children,
  accent = "blue",
}: {
  children: ReactNode;
  accent?: Accent;
}) {
  const color = accentColor(accent);
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{
        color,
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
      }}
    >
      {children}
    </span>
  );
}

export function ChartTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-4 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-secondary)]">
      {children}
    </h2>
  );
}

export function InfoNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/[0.08] px-3 py-2 text-xs text-[var(--text-secondary)]">
      <span className="mt-0.5 text-[var(--warning)]">●</span>
      <span>{children}</span>
    </div>
  );
}

export interface SortableColumn<T> {
  /** chave única da coluna */
  key: string;
  label: string;
  /** valor usado na ordenação (default: o próprio campo `key` da linha) */
  sortValue?: (row: T) => number | string;
  /** conteúdo renderizado (default: o próprio campo `key` da linha) */
  render?: (row: T) => ReactNode;
  /** primeira coluna costuma ser o nome — fica sem tabular-nums */
  text?: boolean;
}

/**
 * Tabela com ordenação por qualquer coluna: clicar no cabeçalho ordena
 * (1º clique = maior→menor em números, A→Z em texto; 2º inverte).
 */
export function SortableTable<T extends Record<string, unknown>>({
  columns,
  rows,
  rowKey,
  onRowClick,
  initialSort,
}: {
  columns: SortableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  initialSort?: string;
}) {
  const [sortKey, setSortKey] = useState(initialSort ?? columns[0]?.key);
  const [asc, setAsc] = useState(false);

  const col = columns.find((c) => c.key === sortKey);
  const valueOf = (row: T) =>
    col?.sortValue ? col.sortValue(row) : (row[sortKey] as number | string);

  const sorted = [...rows].sort((a, b) => {
    const va = valueOf(a);
    const vb = valueOf(b);
    if (typeof va === "string" || typeof vb === "string") {
      const cmp = String(va).localeCompare(String(vb), "pt-BR");
      return asc ? cmp : -cmp;
    }
    return asc ? va - vb : vb - va;
  });

  const toggle = (key: string) => {
    if (key === sortKey) {
      setAsc((prev) => !prev);
    } else {
      setSortKey(key);
      // texto começa A→Z; número começa do maior
      setAsc(columns.find((c) => c.key === key)?.text ?? false);
    }
  };

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-[11px] uppercase tracking-[0.1em] text-[var(--text-muted)]">
          {columns.map((c) => (
            <th key={c.key} className="px-5 py-2 font-medium">
              <button
                type="button"
                onClick={() => toggle(c.key)}
                title={`Ordenar por ${c.label}`}
                className={cn(
                  "inline-flex items-center gap-1 uppercase tracking-[0.1em] transition-colors hover:text-[var(--text-primary)]",
                  sortKey === c.key && "text-[var(--text-primary)]",
                )}
              >
                {c.label}
                <span className="text-[9px] leading-none">
                  {sortKey === c.key ? (asc ? "▲" : "▼") : "⇅"}
                </span>
              </button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.map((row) => (
          <tr
            key={rowKey(row)}
            className={cn(
              "border-t",
              onRowClick && "cursor-pointer hover:bg-[var(--surface-2)]/60",
            )}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
          >
            {columns.map((c) => (
              <td
                key={c.key}
                className={cn(
                  "px-5 py-3",
                  c.text ? "font-medium" : "tabular-nums",
                )}
              >
                {c.render ? c.render(row) : String(row[c.key] ?? "")}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Loading() {
  return <div className="text-sm text-[var(--text-muted)]">Carregando…</div>;
}

export function ErrorState({ message }: { message?: string }) {
  return (
    <div className="text-sm text-[var(--critical)]">
      Erro ao carregar dados{message ? `: ${message}` : ""}.
    </div>
  );
}
