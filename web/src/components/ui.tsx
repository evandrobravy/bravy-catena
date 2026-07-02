import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";
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
}: {
  label: string;
  value: string | number;
  suffix?: string;
  hint?: string;
  accent?: Accent;
  icon?: LucideIcon;
}) {
  const color = accentColor(accent);
  return (
    <div className="rounded-xl border bg-[var(--surface)] p-5 transition-colors hover:border-[var(--border-strong)]">
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
