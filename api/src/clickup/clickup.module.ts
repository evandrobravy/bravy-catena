import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ClickUpRateLimiter } from './clickup-rate-limiter';
import { ClickUpService } from './clickup.service';

@Module({
  imports: [HttpModule],
  providers: [ClickUpService, ClickUpRateLimiter],
  exports: [ClickUpService, ClickUpRateLimiter],
})
export class ClickUpModule {}
