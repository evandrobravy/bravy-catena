import axios from "axios";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export const api = axios.create({ baseURL: API_URL });

export interface MetricsFilters {
  modelo?: string;
  macro?: string;
  closer?: string;
  seminario?: string;
}

function toParams(f?: MetricsFilters) {
  const p: Record<string, string> = {};
  if (f?.modelo) p.modelo = f.modelo;
  if (f?.macro) p.macro = f.macro;
  if (f?.closer) p.closer = f.closer;
  if (f?.seminario) p.seminario = f.seminario;
  return p;
}

export async function fetchMetric<T>(
  dashboard: string,
  filters?: MetricsFilters,
): Promise<T> {
  const { data } = await api.get<T>(`/metrics/${dashboard}`, {
    params: toParams(filters),
  });
  return data;
}
