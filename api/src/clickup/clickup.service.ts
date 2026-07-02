import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError, AxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';
import { ClickUpRateLimiter } from './clickup-rate-limiter';
import { ClickUpTask, ClickUpTasksResponse } from './clickup.types';

const BASE_URL = 'https://api.clickup.com/api/v2';

/**
 * Integração pura com o ClickUp (HTTP). Não conhece Postgres.
 * Toda chamada passa pelo rate limiter e faz retry em 429.
 */
@Injectable()
export class ClickUpService {
  private readonly logger = new Logger(ClickUpService.name);
  private readonly apiKey: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly limiter: ClickUpRateLimiter,
  ) {
    this.apiKey = this.config.getOrThrow<string>('CLICKUP_API_KEY');
  }

  private async request<T>(
    path: string,
    params?: Record<string, unknown>,
    attempt = 0,
  ): Promise<T> {
    const cfg: AxiosRequestConfig = {
      baseURL: BASE_URL,
      headers: { Authorization: this.apiKey },
      params,
    };
    try {
      return await this.limiter.schedule(async () => {
        const res = await firstValueFrom(this.http.get<T>(path, cfg));
        return res.data;
      });
    } catch (err) {
      const axErr = err as AxiosError;
      const status = axErr.response?.status;
      if (status === 429 && attempt < 4) {
        const wait = 2000 * (attempt + 1);
        this.logger.warn(`429 em ${path}, retry em ${wait}ms`);
        await new Promise((r) => setTimeout(r, wait));
        return this.request<T>(path, params, attempt + 1);
      }
      this.logger.error(`Erro ClickUp ${path}: ${status} ${axErr.message}`);
      throw err;
    }
  }

  /**
   * Busca todas as tasks de uma list, paginando. include_closed pega
   * também tasks em status fechado. dateUpdatedGt filtra sync incremental.
   */
  async getListTasks(
    listId: string,
    opts: { dateUpdatedGt?: number } = {},
  ): Promise<ClickUpTask[]> {
    const all: ClickUpTask[] = [];
    let page = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const data = await this.request<ClickUpTasksResponse>(
        `/list/${listId}/task`,
        {
          page,
          include_closed: true,
          subtasks: true,
          ...(opts.dateUpdatedGt
            ? { date_updated_gt: opts.dateUpdatedGt }
            : {}),
        },
      );
      const tasks = data.tasks ?? [];
      all.push(...tasks);
      if (data.last_page || tasks.length === 0) break;
      page += 1;
    }
    return all;
  }

  async getTask(taskId: string): Promise<ClickUpTask> {
    return this.request<ClickUpTask>(`/task/${taskId}`);
  }

  /** Retorna todas as lists de um space (folders + folderless). */
  async getSpaceListIds(spaceId: string): Promise<string[]> {
    const ids: string[] = [];
    const folders = await this.request<{
      folders: { lists: { id: string }[] }[];
    }>(`/space/${spaceId}/folder`, { archived: false });
    for (const f of folders.folders ?? []) {
      for (const l of f.lists ?? []) ids.push(l.id);
    }
    const folderless = await this.request<{ lists: { id: string }[] }>(
      `/space/${spaceId}/list`,
      { archived: false },
    );
    for (const l of folderless.lists ?? []) ids.push(l.id);
    return ids;
  }
}
