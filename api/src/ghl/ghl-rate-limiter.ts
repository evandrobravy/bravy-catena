import { Injectable, Logger } from '@nestjs/common';
import Bottleneck from 'bottleneck';

/**
 * Gateway ÚNICO para o GHL. Todas as requisições passam por aqui.
 * GHL não documenta rate limit pra /contacts/search — números conservadores,
 * ajustar depois de observar 429s reais (ver plano, seção de riscos).
 */
@Injectable()
export class GhlRateLimiter {
  private readonly logger = new Logger(GhlRateLimiter.name);

  private readonly limiter = new Bottleneck({
    reservoir: 60,
    reservoirRefreshAmount: 60,
    reservoirRefreshInterval: 60 * 1000,
    maxConcurrent: 3,
    minTime: 150,
  });

  private count = 0;

  schedule<T>(fn: () => Promise<T>): Promise<T> {
    return this.limiter.schedule(async () => {
      this.count += 1;
      return fn();
    });
  }

  /** Total de requisições agendadas desde o último reset (observabilidade). */
  get requestCount(): number {
    return this.count;
  }

  resetCount(): void {
    this.count = 0;
  }
}
