"use client";

/**
 * Seletor de seminário: lista todos os seminários que existem na base e
 * permite isolar um deles (pedido da Catena no retorno de 21/07).
 */
export function SeminarioFilter({
  seminarios,
  value,
  onChange,
}: {
  seminarios: string[];
  value: string | null;
  onChange: (seminario: string | null) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
      Seminário
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="min-w-[190px] rounded-lg border bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--border-strong)]"
      >
        <option value="">Todos ({seminarios.length})</option>
        {seminarios.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </label>
  );
}
