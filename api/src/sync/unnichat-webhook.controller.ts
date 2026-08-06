import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  Logger,
  Post,
  Query,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mapUnnichatWebhook } from '../unnichat/mappers/lead.mapper';
import { UnnichatSyncService } from './unnichat-sync.service';

/**
 * Recebe os leads do UnniChat (plataforma que a Catena passou a usar no lugar
 * do GHL). Do lado deles é uma automação com a ação "enviar webhook" apontando
 * pra cá — ver docs/integracao-unnichat.md pro passo a passo e pro corpo
 * recomendado. O token vai na query (`?token=`) porque a UI da plataforma nem
 * sempre deixa customizar header.
 */
@Controller('webhooks')
export class UnnichatWebhookController {
  private readonly logger = new Logger(UnnichatWebhookController.name);

  constructor(
    private readonly unnichat: UnnichatSyncService,
    private readonly config: ConfigService,
  ) {}

  @Post('unnichat')
  async receive(
    @Headers('x-webhook-token') headerToken: string | undefined,
    @Query('token') queryToken: string | undefined,
    @Body() raw: Record<string, unknown>,
  ) {
    const expected = this.config.get<string>('UNNICHAT_WEBHOOK_TOKEN');
    if (expected && headerToken !== expected && queryToken !== expected) {
      throw new ForbiddenException('token inválido');
    }

    // TEMP (captura do shape real do payload UnniChat p/ mapear seminário) —
    // remover depois de confirmar os campos. Ativado por UNNICHAT_DEBUG_BODY=1.
    if (this.config.get<string>('UNNICHAT_DEBUG_BODY') === '1') {
      this.logger.log(`UNNICHAT_RAW_BODY ${JSON.stringify(raw)}`);
    }

    const mapped = mapUnnichatWebhook(raw ?? {});
    if (!mapped) {
      // 200 mesmo assim: payload inesperado não pode virar retry storm lá.
      this.logger.warn(
        `Payload UnniChat sem identificador, ignorando: ${JSON.stringify(raw)}`,
      );
      return { ok: true, skipped: true };
    }

    await this.unnichat.upsertLead(mapped);
    return { ok: true };
  }
}
