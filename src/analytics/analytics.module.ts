import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { GoatCounterService } from './goatcounter.service';
import { CloudflareService } from './cloudflare.service';

/**
 * Módulo de analítica: agrega GoatCounter (REST) + Cloudflare (GraphQL), cachea en Postgres
 * y expone /analytics/* protegido por API key. PrismaService llega del PrismaModule global.
 */
@Module({
  imports: [HttpModule],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    GoatCounterService,
    CloudflareService,
    ApiKeyGuard,
  ],
})
export class AnalyticsModule {}
