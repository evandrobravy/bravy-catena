import { GhlContact } from '../ghl.types';

export interface MappedGhlLead {
  ghlContactId: string;
  fonte: 'ghl';
  name: string;
  status: string;
  seminario: null;
  closer: null;
  produtoVendido: null;
  valor: null;
  agendamento: null;
  realizada: null;
  dateCreated: Date;
}

/**
 * Escopo MVP = só volume de leads (ver plano de ingestão GHL). Não mapeia
 * seminário/closer/produtoVendido/valor/agendamento/realizada de propósito —
 * não-objetivo desta fase, não porque o dado não exista no GHL.
 */
const STATUS_GHL = 'lead ghl';

function nomeContato(
  first?: string | null,
  last?: string | null,
  name?: string | null,
  email?: string | null,
): string {
  const composto = [first, last].filter(Boolean).join(' ').trim();
  return composto || name?.trim() || email?.trim() || 'Lead GHL sem nome';
}

/** Caminho do backfill — schema mais confiável, vindo de /contacts/search. */
export function mapContact(c: GhlContact): MappedGhlLead | null {
  if (!c.id) return null;
  return {
    ghlContactId: c.id,
    fonte: 'ghl',
    name: nomeContato(c.firstName, c.lastName, c.name, c.email),
    status: STATUS_GHL,
    seminario: null,
    closer: null,
    produtoVendido: null,
    valor: null,
    agendamento: null,
    realizada: null,
    dateCreated: c.dateAdded ? new Date(c.dateAdded) : new Date(),
  };
}

/**
 * Caminho do webhook — shape do payload NÃO confirmado até testarmos um
 * Workflow real do GHL (ver plano, seção de riscos). Tenta várias chaves
 * plausíveis; nunca lança — devolve null se não achar um id de contato, pra
 * o controller responder 200 e logar em vez de 500ar em payload inesperado.
 */
export function mapWebhookPayloadToLead(
  raw: Record<string, unknown>,
): MappedGhlLead | null {
  const contact = (raw.contact ?? raw) as Record<string, unknown>;
  const id = (contact.id ?? contact.contact_id ?? contact.contactId) as
    | string
    | undefined;
  if (!id || typeof id !== 'string') return null;

  const first = (contact.first_name ?? contact.firstName) as
    | string
    | undefined;
  const last = (contact.last_name ?? contact.lastName) as string | undefined;
  const name = (contact.full_name ?? contact.name) as string | undefined;
  const email = contact.email as string | undefined;
  const dateRaw = (contact.date_created ?? contact.dateAdded) as
    | string
    | undefined;

  return {
    ghlContactId: id,
    fonte: 'ghl',
    name: nomeContato(first, last, name, email),
    status: STATUS_GHL,
    seminario: null,
    closer: null,
    produtoVendido: null,
    valor: null,
    agendamento: null,
    realizada: null,
    dateCreated: dateRaw ? new Date(dateRaw) : new Date(),
  };
}
