import { Injectable, Logger } from '@nestjs/common';
import Bottleneck from 'bottleneck';

/**
 * Gateway ÚNICO para o ClickUp. Todas as requisições passam por aqui.
 * ClickUp limita 100 req/min por token; mantemos folga (~90/min) e
 * fazemos até 5 requisições concorrentes.
 */
@Injectable()
export class ClickUpRateLimiter {
  private readonly logger = new Logger(ClickUpRateLimiter.name);

  private readonly limiter = new Bottleneck({
    reservoir: 90,
    reservoirRefreshAmount: 90,
    reservoirRefreshInterval: 60 * 1000,
    maxConcurrent: 5,
    minTime: 120,
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
