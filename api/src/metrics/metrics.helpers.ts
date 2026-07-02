import { Prisma } from '@prisma/client';
import { MetricsFilterDto } from './dto/filters.dto';

export const ATIVO_STATUSES = ['aguardando iniciação', 'execução', 'em encerramento'];
export const CONCLUIDO_STATUSES = ['finalizado'];
export const PARALISADO_STATUSES = ['paralisado'];

export function macroToStatuses(macro?: string): string[] | undefined {
  if (macro === 'ativo') return ATIVO_STATUSES;
  if (macro === 'concluido') return CONCLUIDO_STATUSES;
  if (macro === 'paralisado') return PARALISADO_STATUSES;
  return undefined;
}

/** Monta o where do Prisma para Client a partir dos filtros. */
export function clientWhere(f: MetricsFilterDto): Prisma.ClientWhereInput {
  const where: Prisma.ClientWhereInput = {};
  if (f.modelo) where.modelo = f.modelo;
  const statuses = macroToStatuses(f.macro);
  if (statuses) where.status = { in: statuses };
  return where;
}

export function daysBetween(from: Date, to: Date = new Date()): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

/** Classifica idade em dias numa faixa de envelhecimento. */
export function ageBucket(days: number): string {
  if (days <= 60) return '0-60';
  if (days <= 90) return '61-90';
  if (days <= 120) return '91-120';
  if (days <= 180) return '121-180';
  if (days <= 360) return '181-360';
  return '360+';
}

export function progressoBucket(p: number | null): string {
  if (p === null) return 'sem';
  if (p < 25) return '<25';
  if (p <= 50) return '26-50';
  if (p <= 75) return '51-75';
  return '>75';
}
