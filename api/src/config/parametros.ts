/**
 * PARÂMETROS DA FASE 3 — provisórios, aguardando confirmação da Catena.
 *
 * Estes dois mapas são os "inputs do cliente" do plano. Estão preenchidos com
 * estimativas para o dashboard já funcionar; a Catena deve revisar/ajustar.
 * Alterar aqui é suficiente — nenhuma mudança de código/sync é necessária.
 */

/** Meta total de entrega da holding (reunião 30/06: "holding em 4 meses"). */
export const META_TOTAL_DIAS = 120;

/** SLA (dias esperados) por marco/etapa — chave = id do StageDef (1..8). */
export const STAGE_SLA_DIAS: Record<number, number> = {
  1: 15, // Onboarding
  2: 20, // Célula Destino
  3: 20, // Célula Cofre
  4: 30, // ITBI & Registro
  5: 15, // Célula Veículo
  6: 10, // Acordo de Sócios
  7: 10, // Entrega da Holding
  8: 15, // Extras
};

export type Origem = 'cliente' | 'interno' | 'orgao_cartorio';

/**
 * Classificação de cada STATUS operacional por origem do tempo parado.
 * Chave = status normalizado (minúsculas, SEM acento). Não mapeado → 'interno'.
 */
export const STATUS_ORIGEM: Record<string, Origem> = {
  // aguardando o cliente
  'enviado ao cliente': 'cliente',
  solicitado: 'cliente',
  'aguardando deposito': 'cliente',
  pendencia: 'cliente',
  'em pendencia': 'cliente',
  // órgão / cartório / junta / prefeitura
  'abertura solicitada': 'orgao_cartorio',
  'recurso em analise': 'orgao_cartorio',
  // interno (equipe Catena)
  'para fazer': 'interno',
  'em andamento': 'interno',
  'em revisao': 'interno',
  'em alteracao & ajustes': 'interno',
  'em analise': 'interno',
  'fazer recurso': 'interno',
  'reuniao de apresentacao': 'interno',
};

/** minúsculas + sem acentos, pra casar com as chaves de STATUS_ORIGEM. */
export function normalizeStatus(status: string): string {
  return status
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

export function origemDoStatus(status: string | null | undefined): Origem {
  if (!status) return 'interno';
  return STATUS_ORIGEM[normalizeStatus(status)] ?? 'interno';
}

export const ORIGEM_LABEL: Record<Origem, string> = {
  cliente: 'Cliente',
  interno: 'Interno',
  orgao_cartorio: 'Órgão / Cartório',
};
