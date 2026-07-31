import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError, AxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';
import { GhlRateLimiter } from './ghl-rate-limiter';
import { GhlContact, GhlContactsSearchResponse } from './ghl.types';

const BASE_URL = 'https://services.leadconnectorhq.com';
const PAGE_LIMIT = 100;

/**
 * Integração pura com o GHL (HTTP). Não conhece Postgres.
 * Auth: Private Integration Token (Bearer, estático, por location) — ver
 * plano de ingestão GHL. Toda chamada passa pelo rate limiter e faz retry em 429.
 */
@Injectable()
export class GhlService {
  private readonly logger = new Logger(GhlService.name);
  private readonly token: string;
  private readonly locationId: string;
  private readonly apiVersion: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly limiter: GhlRateLimiter,
  ) {
    this.token = this.config.getOrThrow<string>('GHL_PRIVATE_TOKEN');
    this.locationId = this.config.getOrThrow<string>('GHL_LOCATION_ID');
    this.apiVersion =
      this.config.get<string>('GHL_API_VERSION') ?? '2021-07-28';
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: Record<string, unknown>,
    attempt = 0,
  ): Promise<T> {
    const cfg: AxiosRequestConfig = {
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Version: this.apiVersion,
        'Content-Type': 'application/json',
      },
    };
    try {
      return await this.limiter.schedule(async () => {
        const res =
          method === 'GET'
            ? await firstValueFrom(this.http.get<T>(path, cfg))
            : await firstValueFrom(this.http.post<T>(path, body, cfg));
        return res.data;
      });
    } catch (err) {
      const axErr = err as AxiosError;
      const status = axErr.response?.status;
      if (status === 429 && attempt < 4) {
        const wait = 2000 * (attempt + 1);
        this.logger.warn(`429 em ${path}, retry em ${wait}ms`);
        await new Promise((r) => setTimeout(r, wait));
        return this.request<T>(method, path, body, attempt + 1);
      }
      this.logger.error(`Erro GHL ${path}: ${status} ${axErr.message}`);
      throw err;
    }
  }

  /**
   * Uma página de contatos. Shape exato do request/response não confirmado
   * contra conta real — validar assim que o Private Integration Token chegar
   * (ver plano de ingestão GHL, Fase B).
   */
  async searchContacts(
    opts: { pageLimit?: number; searchAfter?: unknown[] } = {},
  ): Promise<GhlContactsSearchResponse> {
    return this.request<GhlContactsSearchResponse>('POST', '/contacts/search', {
      locationId: this.locationId,
      pageLimit: opts.pageLimit ?? PAGE_LIMIT,
      ...(opts.searchAfter ? { searchAfter: opts.searchAfter } : {}),
    });
  }

  /**
   * Busca todos os contatos da location, paginando via cursor `searchAfter`
   * retornado em `meta`. Defensivo: para na primeira página vazia em vez de
   * confiar cegamente num campo de cursor específico (schema não confirmado).
   */
  async getAllContacts(): Promise<GhlContact[]> {
    const all: GhlContact[] = [];
    let searchAfter: unknown[] | undefined;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const data = await this.searchContacts({ searchAfter });
      const contacts = data.contacts ?? [];
      if (contacts.length === 0) break;
      all.push(...contacts);
      const meta = data.meta as
        | { startAfter?: number; startAfterId?: string }
        | undefined;
      if (!meta?.startAfter || !meta?.startAfterId) break;
      searchAfter = [meta.startAfter, meta.startAfterId];
      if (contacts.length < PAGE_LIMIT) break;
    }
    return all;
  }
}
