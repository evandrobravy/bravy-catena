/**
 * Mapper do payload de webhook do UnniChat (whitelabel do SendFlow).
 *
 * Shape real confirmado em produção (06/08), automação "Contato criado" →
 * "Requisição HTTP" POST, body padrão:
 *   {
 *     "contact": {
 *       "id": "019fd812-...",            // UUIDv7
 *       "name": "...", "email": "...",
 *       "phoneNumber": "5521999990002",
 *       "tags": "Seminário 01, Qualificado",   // STRING separada por vírgula
 *       "fields": { "utm_campaign": "...", "Seminário": "...", ... },
 *       "instaName": "", "profilePicUrl": ""
 *     },
 *     "event_date": 1786036543,           // epoch s (raiz)
 *     "triggerData": {}
 *   }
 *
 * O mapper é tolerante: aceita o contato na raiz ou em contact/lead/data, tags
 * como string OU lista, custom fields dentro de `fields`, e várias grafias de
 * cada campo. Nunca lança: devolve null quando não acha identificador, e o
 * controller responde 200 pra não gerar retry storm do lado deles.
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

/** O objeto de custom fields do contato (utm_*, Seminário, Qualificação, ...). */
function customFields(c: Raw): Raw {
  const f = c['fields'] ?? c['customFields'] ?? c['custom_fields'];
  return f && typeof f === 'object' && !Array.isArray(f) ? (f as Raw) : {};
}

/** Busca em custom fields por nome, case-insensitive (chaves variam de grafia). */
function pickField(fields: Raw, ...names: string[]): string | null {
  const lower: Raw = {};
  for (const [k, v] of Object.entries(fields)) lower[k.toLowerCase()] = v;
  for (const n of names) {
    const v = lower[n.toLowerCase()];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  }
  return null;
}

/** Tags do contato — aceita string ("a, b") ou lista. */
function tagsList(c: Raw): string[] {
  const raw = c['tags'] ?? c['etiquetas'] ?? c['labels'];
  if (Array.isArray(raw)) {
    return raw
      .filter((x) => typeof x === 'string' && x.trim())
      .map((x) => (x as string).trim());
  }
  if (typeof raw === 'string' && raw.trim()) {
    return raw
      .split(/[;,]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
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
  const fields = customFields(c);
  const tags = tagsList(c);

  const telefone = digits(
    pick(c, 'phoneNumber', 'phone_number', 'phone', 'telefone', 'whatsapp', 'number', 'numero', 'celular'),
  );
  const id =
    pick(c, 'id', 'contact_id', 'contactId', 'lead_id', 'leadId', 'uuid') ??
    telefone;
  if (!id) return null;

  // Seminário de origem: o UnniChat não tem um campo "Seminário 01/02" fixo, então
  // pega o primeiro sinal de origem que existir — campo custom explícito, depois
  // UTM de campanha/fonte, por fim a 1ª tag (as tags deles marcam a campanha).
  const seminario =
    pick(c, 'seminario', 'origem', 'source', 'campanha', 'campaign') ??
    pickField(fields, 'seminário', 'seminario', 'origem', 'utm_campaign', 'utm_source', 'campanha') ??
    tags[0] ??
    null;

  return {
    externalId: `unnichat:${id}`,
    fonte: 'unnichat',
    name: nomeContato(c, telefone),
    status:
      pick(c, 'status', 'etapa', 'stage', 'funil', 'funnel') ??
      pickField(fields, 'qualificação', 'qualificacao') ??
      tags[0] ??
      STATUS_PADRAO,
    seminario,
    closer:
      pick(c, 'closer', 'atendente', 'responsavel', 'assigned_to', 'owner') ??
      pickField(fields, 'atendente', 'closer', 'responsável', 'responsavel'),
    produtoVendido: null,
    valor: null,
    agendamento: null,
    realizada: null,
    dateCreated: parseData(
      pick(c, 'created_at', 'createdAt', 'criado_em', 'date', 'timestamp') ??
        pick(raw, 'event_date', 'eventDate', 'timestamp'),
    ),
  };
}
