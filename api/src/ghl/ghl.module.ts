import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { GhlRateLimiter } from './ghl-rate-limiter';
import { GhlService } from './ghl.service';

@Module({
  imports: [HttpModule],
  providers: [GhlService, GhlRateLimiter],
  exports: [GhlService, GhlRateLimiter],
})
export class GhlModule {}
