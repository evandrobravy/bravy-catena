"use client";

const MODELOS = ["1 Célula", "2 Células", "3 Células"];

/** Filtro por modelo de holding (drill pedido na reunião 30/06). */
export function ModeloFilter({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (modelo: string | null) => void;
}) {
  const options: { label: string; modelo: string | null }[] = [
    { label: "Todos", modelo: null },
    ...MODELOS.map((m) => ({ label: m, modelo: m })),
  ];
  return (
    <div className="flex items-center gap-1 rounded-lg border bg-[var(--surface)] p-1">
      {options.map((o) => {
        const active = value === o.modelo;
        return (
          <button
            key={o.label}
            type="button"
            onClick={() => onChange(o.modelo)}
            className={
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors " +
              (active
                ? "bg-[var(--surface-2)] text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]")
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
