"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpDown, Download, ExternalLink, Search, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  clickupUrl,
  DrillColumn,
  DrillItem,
  DrillParams,
  DrillResponse,
  DrillTipo,
  fetchDrill,
  formatCell,
  toCsv,
} from "@/lib/drill";
import { Badge, ErrorState } from "./ui";

// ── contexto ────────────────────────────────────────────────────────────

export interface DrillRequest {
  key: string;
  params?: DrillParams;
  titulo: string;
  diasLabel?: string;
}

interface DrillContextValue {
  openDrill: (req: DrillRequest) => void;
  closeDrill: () => void;
}

const DrillContext = createContext<DrillContextValue | null>(null);

export function useDrill(): DrillContextValue {
  const ctx = useContext(DrillContext);
  if (!ctx) throw new Error("useDrill fora do DrillProvider");
  return ctx;
}

export function DrillProvider({ children }: { children: React.ReactNode }) {
  // pilha: drill aninhado (cliente → tarefas) empilha e volta com ←
  const [stack, setStack] = useState<DrillRequest[]>([]);

  const openDrill = useCallback((req: DrillRequest) => {
    setStack((s) => [...s, req]);
  }, []);
  const closeDrill = useCallback(() => setStack([]), []);
  const popDrill = useCallback(() => setStack((s) => s.slice(0, -1)), []);

  const value = useMemo(() => ({ openDrill, closeDrill }), [openDrill, closeDrill]);

  return (
    <DrillContext.Provider value={value}>
      {children}
      {stack.length > 0 && (
        <DrillPanel
          req={stack[stack.length - 1]}
          canGoBack={stack.length > 1}
          onBack={popDrill}
          onClose={closeDrill}
          onOpenNested={openDrill}
        />
      )}
    </DrillContext.Provider>
  );
}

// ── colunas por tipo ────────────────────────────────────────────────────

const COLUMNS: Record<DrillTipo, DrillColumn[]> = {
  task: [
    { key: "nome", label: "Tarefa" },
    { key: "cliente", label: "Cliente" },
    { key: "lista", label: "Lista" },
    { key: "status", label: "Status" },
    { key: "assignee", label: "Responsável" },
    { key: "dueDate", label: "Due", format: "date" },
    { key: "dias", label: "Dias", format: "dias" },
  ],
  client: [
    { key: "nome", label: "Cliente" },
    { key: "modelo", label: "Modelo" },
    { key: "status", label: "Status" },
    { key: "progresso", label: "Progresso", format: "pct" },
    { key: "marcoAtual", label: "Marco" },
    { key: "dias", label: "Dias", format: "dias" },
  ],
  lead: [
    { key: "nome", label: "Lead" },
    { key: "seminario", label: "Seminário" },
    { key: "closer", label: "Closer" },
    { key: "produtoVendido", label: "Produto" },
    { key: "valor", label: "Valor", format: "valor" },
    { key: "realizada", label: "Reunião", format: "date" },
  ],
  passagem: [
    { key: "tarefa", label: "Tarefa" },
    { key: "cliente", label: "Cliente" },
    { key: "lista", label: "Lista" },
    { key: "entrou", label: "Entrou", format: "date" },
    { key: "saiu", label: "Saiu", format: "date" },
    { key: "dias", label: "Dias", format: "dias" },
  ],
};

const SEARCH_KEYS = ["nome", "tarefa", "cliente", "assignee", "closer"];

// ── painel ──────────────────────────────────────────────────────────────

function DrillPanel({
  req,
  canGoBack,
  onBack,
  onClose,
  onOpenNested,
}: {
  req: DrillRequest;
  canGoBack: boolean;
  onBack: () => void;
  onClose: () => void;
  onOpenNested: (r: DrillRequest) => void;
}) {
  const [take, setTake] = useState(100);
  const [busca, setBusca] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);

  useEffect(() => {
    setTake(100);
    setBusca("");
    setSort(null);
  }, [req]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const { data, isLoading, error } = useQuery<DrillResponse>({
    queryKey: ["drill", req.key, req.params, take],
    queryFn: () => fetchDrill(req.key, { ...req.params, take }),
    placeholderData: keepPreviousData,
  });

  const columns = useMemo(() => {
    if (!data) return [];
    const cols = [...COLUMNS[data.tipo]];
    if (req.diasLabel) {
      const c = cols.find((x) => x.key === "dias");
      if (c) c.label = req.diasLabel;
    }
    // badge de motivo no em-atraso
    if (data.items.some((i) => i.motivo !== undefined)) {
      cols.splice(cols.length - 1, 0, { key: "motivo", label: "Motivo" });
    }
    return cols;
  }, [data, req.diasLabel]);

  const items = useMemo(() => {
    if (!data) return [];
    let rows = data.items;
    if (busca.trim()) {
      const q = busca.trim().toLowerCase();
      rows = rows.filter((i) =>
        SEARCH_KEYS.some((k) =>
          String(i[k] ?? "")
            .toLowerCase()
            .includes(q),
        ),
      );
    }
    if (sort) {
      rows = [...rows].sort((a, b) => {
        const av = a[sort.key];
        const bv = b[sort.key];
        if (av === bv) return 0;
        if (av === null || av === undefined) return 1;
        if (bv === null || bv === undefined) return -1;
        return (av < bv ? -1 : 1) * sort.dir;
      });
    }
    return rows;
  }, [data, busca, sort]);

  const exportCsv = () => {
    if (!data) return;
    const blob = new Blob(["﻿" + toCsv(items, columns)], {
      type: "text/csv;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${req.key.replace(/\./g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const agregadoLabel = data?.agregado
    ? [
        data.agregado.clientes !== undefined
          ? `${data.agregado.clientes} clientes`
          : null,
        data.agregado.media !== undefined ? `média ${data.agregado.media}` : null,
        data.agregado.soma !== undefined
          ? `soma ${formatCell(data.agregado.soma, "valor")}`
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-3xl flex-col border-l bg-[var(--surface)] shadow-2xl">
        {/* header */}
        <div className="flex items-center gap-3 border-b px-5 py-4">
          {canGoBack && (
            <button
              type="button"
              onClick={onBack}
              className="rounded-md p-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold tracking-tight">
              {req.titulo}
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              {data
                ? `${data.total} ${data.tipo === "client" ? "clientes" : data.tipo === "lead" ? "leads" : data.tipo === "passagem" ? "passagens" : "tarefas"}${agregadoLabel ? ` · ${agregadoLabel}` : ""}`
                : "Carregando…"}
            </p>
          </div>
          <button
            type="button"
            onClick={exportCsv}
            className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* busca */}
        <div className="border-b px-5 py-2.5">
          <div className="flex items-center gap-2 rounded-md border bg-[var(--surface-2)]/50 px-2.5 py-1.5">
            <Search className="h-3.5 w-3.5 text-[var(--text-muted)]" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, cliente, responsável…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
            />
          </div>
        </div>

        {/* corpo */}
        <div className="flex-1 overflow-auto">
          {isLoading && (
            <div className="space-y-2 p-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-9 animate-pulse rounded-md bg-[var(--surface-2)]"
                />
              ))}
            </div>
          )}
          {error != null && (
            <div className="p-5">
              <ErrorState />
            </div>
          )}
          {data && !isLoading && (
            <>
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[var(--surface)]">
                  <tr className="text-left text-[11px] uppercase tracking-[0.1em] text-[var(--text-muted)]">
                    {columns.map((c) => (
                      <th key={c.key} className="whitespace-nowrap px-4 py-2 font-medium">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 hover:text-[var(--text-primary)]"
                          onClick={() =>
                            setSort((s) =>
                              s?.key === c.key
                                ? { key: c.key, dir: s.dir === 1 ? -1 : 1 }
                                : { key: c.key, dir: c.key === "dias" ? -1 : 1 },
                            )
                          }
                        >
                          {c.label}
                          <ArrowUpDown className="h-3 w-3 opacity-50" />
                        </button>
                      </th>
                    ))}
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <DrillRow
                      key={`${item.clickupId}-${idx}`}
                      item={item}
                      columns={columns}
                      tipo={data.tipo}
                      onOpenNested={onOpenNested}
                    />
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td
                        colSpan={columns.length + 1}
                        className="px-4 py-8 text-center text-sm text-[var(--text-muted)]"
                      >
                        {busca
                          ? "Nada encontrado para a busca."
                          : "Nenhum item nesta fatia."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {data.items.length < data.total && !busca && (
                <div className="p-4 text-center">
                  <button
                    type="button"
                    onClick={() => setTake((t) => t + 100)}
                    className="rounded-md border px-4 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
                  >
                    Mostrar mais ({data.items.length} de {data.total})
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const MOTIVO_LABEL: Record<string, string> = {
  due_vencido: "Due vencido",
  acima_meta: "Acima da meta",
};

function DrillRow({
  item,
  columns,
  tipo,
  onOpenNested,
}: {
  item: DrillItem;
  columns: DrillColumn[];
  tipo: DrillTipo;
  onOpenNested: (r: DrillRequest) => void;
}) {
  const nested =
    tipo === "client"
      ? () =>
          onOpenNested({
            key: "cliente.tarefas",
            params: { clientId: item.clickupId ?? undefined },
            titulo: `Tarefas abertas — ${item.nome}`,
            diasLabel: "Dias parado",
          })
      : undefined;

  return (
    <tr
      className={
        "border-t" + (nested ? " cursor-pointer hover:bg-[var(--surface-2)]/60" : "")
      }
      onClick={nested}
    >
      {columns.map((c) => (
        <td key={c.key} className="max-w-56 truncate px-4 py-2.5">
          {c.key === "status" && item[c.key] ? (
            <Badge accent="blue">{String(item[c.key])}</Badge>
          ) : c.key === "motivo" && item[c.key] ? (
            <Badge accent={item[c.key] === "due_vencido" ? "red" : "amber"}>
              {MOTIVO_LABEL[String(item[c.key])] ?? String(item[c.key])}
            </Badge>
          ) : c.key === "dias" ? (
            <span className="font-medium tabular-nums">
              {formatCell(item[c.key])}
            </span>
          ) : (
            formatCell(item[c.key], c.format)
          )}
        </td>
      ))}
      <td className="px-3 py-2.5">
        {item.clickupId && (
          <a
            href={clickupUrl(item.clickupId)}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            aria-label="Abrir no ClickUp"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </td>
    </tr>
  );
}
