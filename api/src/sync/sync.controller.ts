import {
  Controller,
  ForbiddenException,
  Headers,
  Post,
  Query,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SyncService } from './sync.service';

@Controller('sync')
export class SyncController {
  constructor(
    private readonly sync: SyncService,
    private readonly config: ConfigService,
  ) {}

  @Post('run')
  async run(
    @Headers('x-sync-token') token: string,
    @Query('kind') kind?: string,
  ) {
    const expected = this.config.get<string>('SYNC_TOKEN');
    if (expected && token !== expected) {
      throw new ForbiddenException('token inválido');
    }
    const k = kind === 'incremental' ? 'incremental' : 'full';
    return this.sync.run(k);
  }
}
