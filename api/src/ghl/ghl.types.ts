/**
 * Shapes soltos de propósito: o schema exato de /contacts/search e do payload
 * de webhook do GHL não foi confirmado contra uma conta real (ver plano,
 * seção de riscos) — index signature tolera campos não mapeados em vez de
 * quebrar em runtime quando o formato real divergir do esperado.
 */
export interface GhlContact {
  id: string;
  locationId?: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  dateAdded?: string;
  source?: string | null;
  tags?: string[];
  [key: string]: unknown;
}

export interface GhlContactsSearchResponse {
  contacts?: GhlContact[];
  meta?: {
    total?: number;
    nextPageUrl?: string;
    startAfterId?: string;
    startAfter?: number;
  };
  [key: string]: unknown;
}
