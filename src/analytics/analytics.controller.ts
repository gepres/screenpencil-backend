import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { AnalyticsService } from './analytics.service';
import { PeriodQueryDto } from './dto/period-query.dto';
import type { AnalyticsSummary } from './analytics.types';

/**
 * API de analítica para el panel /admin de la landing. Protegida por API key (x-api-key).
 */
@Controller('analytics')
@UseGuards(ApiKeyGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  /** Resumen combinado (GoatCounter + Cloudflare) del periodo indicado. */
  @Get('summary')
  getSummary(@Query() query: PeriodQueryDto): Promise<AnalyticsSummary> {
    return this.analytics.getSummary(query.period);
  }
}
