/**
 * Mapper do payload de webhook do UnniChat (whitelabel do SendFlow).
 *
 * A plataforma tem módulo de webhook de saída ("notificar outro sistema") em
 * que o corpo do POST é montado pelo próprio usuário na UI — ou seja, não há
 * um shape fixo publicado. Por isso o mapper é tolerante: aceita o contato na
 * raiz, em `contact`, em `lead` ou em `data`, e tenta várias grafias de cada
 * campo (pt e en). Nunca lança: devolve null quando não acha identificador, e
 * o controller responde 200 pra não gerar retry storm do lado deles.
 *
 * Contrato recomendado (documentado em docs/integracao-unnichat.md):
 *   { "id": "...", "nome": "...", "telefone": "...", "email": "...",
 *     "origem": "...", "atendente": "...", "etapa": "...", "criado_em": "..." }
 */

export interface MappedUnnichatLead {
  externalId: string;
  fonte: 'unnichat';
  name: string;
  status: string;
  seminario: string | null;
  closer: string | null;
  produtoVendido: null;
  valor: null;
  agendamento: null;
  realizada: null;
  dateCreated: Date;
}

const STATUS_PADRAO = 'lead unnichat';

type Raw = Record<string, unknown>;

/** Primeira chave presente e não vazia, em qualquer das grafias aceitas. */
function pick(obj: Raw, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  }
  return null;
}

/**
 * Telefone é o identificador de fallback do contato, então precisa ser estável:
 * "(21) 97777-6666" e "+55 21 97777-6666" têm que virar a MESMA chave, senão o
 * mesmo lead entra duas vezes conforme a grafia que a plataforma mandar.
 * Normaliza pra DDI+DDD+número (padrão BR).
 */
function digits(v: string | null): string | null {
  if (!v) return null;
  const d = v.replace(/\D/g, '');
  if (d.length < 8) return null;
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) return d;
  if (d.length === 10 || d.length === 11) return `55${d}`;
  return d;
}

/** Aceita ISO, epoch em segundos e epoch em milissegundos. */
function parseData(v: string | null): Date {
  if (!v) return new Date();
  if (/^\d+$/.test(v)) {
    const n = Number(v);
    const d = new Date(n < 1e12 ? n * 1000 : n);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

/** Etapa/tag pode vir como string ou como lista; interessa a primeira. */
function primeiraTag(obj: Raw): string | null {
  for (const k of ['tags', 'etiquetas', 'labels']) {
    const v = obj[k];
    if (Array.isArray(v)) {
      const t = v.find((x) => typeof x === 'string' && x.trim());
      if (typeof t === 'string') return t.trim();
    }
  }
  return null;
}

function nomeContato(obj: Raw, telefone: string | null): string {
  const composto = [
    pick(obj, 'first_name', 'firstName', 'primeiro_nome'),
    pick(obj, 'last_name', 'lastName', 'sobrenome'),
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
  return (
    pick(obj, 'name', 'nome', 'full_name', 'fullName', 'pushname', 'contactName') ??
    (composto || null) ??
    pick(obj, 'email') ??
    telefone ??
    'Lead UnniChat sem nome'
  );
}

export function mapUnnichatWebhook(raw: Raw): MappedUnnichatLead | null {
  const aninhado = ['contact', 'lead', 'data', 'contato'].reduce<Raw | null>(
    (acc, k) => {
      if (acc) return acc;
      const v = raw[k];
      return v && typeof v === 'object' && !Array.isArray(v) ? (v as Raw) : null;
    },
    null,
  );
  const c: Raw = aninhado ?? raw;

  const telefone = digits(
    pick(c, 'phone', 'telefone', 'whatsapp', 'number', 'numero', 'celular'),
  );
  const id =
    pick(c, 'id', 'contact_id', 'contactId', 'lead_id', 'leadId', 'uuid') ??
    telefone;
  if (!id) return null;

  return {
    externalId: `unnichat:${id}`,
    fonte: 'unnichat',
    name: nomeContato(c, telefone),
    status:
      pick(c, 'status', 'etapa', 'stage', 'funil', 'funnel') ??
      primeiraTag(c) ??
      STATUS_PADRAO,
    seminario: pick(c, 'seminario', 'origem', 'source', 'campanha', 'campaign'),
    closer: pick(c, 'closer', 'atendente', 'responsavel', 'assigned_to', 'owner'),
    produtoVendido: null,
    valor: null,
    agendamento: null,
    realizada: null,
    dateCreated: parseData(
      pick(c, 'created_at', 'createdAt', 'criado_em', 'date', 'timestamp'),
    ),
  };
}
