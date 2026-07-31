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
import { mapWebhookPayloadToLead } from '../ghl/mappers/contact.mapper';
import { GhlSyncService } from './ghl-sync.service';

/**
 * Recebe eventos de um Workflow nativo do GHL (Trigger "Contact Created" →
 * Action "Webhook"), configurado direto na UI do sub-account — ver plano de
 * ingestão GHL, seção 4. Shape exato do payload não confirmado até testarmos
 * um Workflow real (ver riscos).
 */
@Controller('webhooks')
export class GhlWebhookController {
  private readonly logger = new Logger(GhlWebhookController.name);

  constructor(
    private readonly ghlSync: GhlSyncService,
    private readonly config: ConfigService,
  ) {}

  @Post('ghl')
  async receive(
    @Headers('x-webhook-token') headerToken: string | undefined,
    @Query('token') queryToken: string | undefined,
    @Body() raw: Record<string, unknown>,
  ) {
    const expected = this.config.get<string>('GHL_WEBHOOK_TOKEN');
    if (expected && headerToken !== expected && queryToken !== expected) {
      throw new ForbiddenException('token inválido');
    }

    const mapped = mapWebhookPayloadToLead(raw ?? {});
    if (!mapped) {
      this.logger.warn(
        `Payload GHL não reconhecido, ignorando: ${JSON.stringify(raw)}`,
      );
      // 200 mesmo assim — evita retry storm do lado do GHL em payload inesperado.
      return { ok: true, skipped: true };
    }

    await this.ghlSync.upsertLead(mapped);
    return { ok: true };
  }
}
