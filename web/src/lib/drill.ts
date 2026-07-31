import { api } from "./api";

export type DrillTipo = "client" | "task" | "lead" | "passagem";

export interface DrillItem {
  clickupId: string | null;
  fonte?: string;
  [k: string]: unknown;
}

export interface DrillResponse {
  key: string;
  tipo: DrillTipo;
  total: number;
  agregado?: { clientes?: number; media?: number; soma?: number };
  items: DrillItem[];
}

export type DrillParams = Record<string, string | number | undefined>;

export async function fetchDrill(
  key: string,
  params: DrillParams = {},
): Promise<DrillResponse> {
  const clean: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") clean[k] = v;
  }
  const { data } = await api.get<DrillResponse>(`/metrics/drill/${key}`, {
    params: clean,
  });
  return data;
}

export function clickupUrl(clickupId: string): string {
  return `https://app.clickup.com/t/${clickupId}`;
}

/** "01. Onboarding" → 1 (pra charts que só carregam o label do marco). */
export function marcoIdFromLabel(label: string): number | undefined {
  const m = label.match(/^(\d{2})\./);
  return m ? Number(m[1]) : undefined;
}

export interface DrillColumn {
  key: string;
  label: string;
  format?: "date" | "dias" | "valor" | "pct";
}

export function toCsv(items: DrillItem[], columns: DrillColumn[]): string {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.map((c) => esc(c.label)).join(";");
  const rows = items.map((i) =>
    columns.map((c) => esc(formatCell(i[c.key], c.format))).join(";"),
  );
  return [header, ...rows].join("\n");
}

export function formatCell(v: unknown, format?: DrillColumn["format"]): string {
  if (v === null || v === undefined) return "—";
  if (format === "date") {
    const d = new Date(v as string);
    return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
  }
  if (format === "valor") {
    return Number(v).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    });
  }
  if (format === "pct") return `${v}%`;
  return String(v);
}
