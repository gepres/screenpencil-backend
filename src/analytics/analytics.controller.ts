import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { AnalyticsService } from './analytics.service';
import { PeriodQueryDto } from './dto/period-query.dto';
import type {
  AnalyticsDevices,
  AnalyticsEvents,
  AnalyticsSummary,
  AnalyticsTimeseries,
} from './analytics.types';

/**
 * API de analítica para el panel /admin de la landing. Protegida por API key (x-api-key).
 *
 * Se sirve bajo DOS prefijos: `analytics` (histórico) y `panel` (neutro). Los bloqueadores de
 * anuncios/rastreo (uBlock, Brave, AdBlock…) bloquean por filtro cualquier URL con "analytics"
 * o "events" (ERR_BLOCKED_BY_CLIENT), así que el panel usa `/panel/*` y `actions` en vez de `events`.
 */
@Controller(['analytics', 'panel'])
@UseGuards(ApiKeyGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  /** Resumen combinado (GoatCounter + Cloudflare) del periodo indicado. */
  @Get('summary')
  getSummary(@Query() query: PeriodQueryDto): Promise<AnalyticsSummary> {
    return this.analytics.getSummary(query.period);
  }

  /** Acciones/eventos de GoatCounter (descargas, donaciones, idioma, demo, showcase, scroll…). */
  @Get(['events', 'actions'])
  getEvents(@Query() query: PeriodQueryDto): Promise<AnalyticsEvents> {
    return this.analytics.getEvents(query.period);
  }

  /** Serie temporal diaria (visitas/páginas por día), por fuente. */
  @Get('timeseries')
  getTimeseries(@Query() query: PeriodQueryDto): Promise<AnalyticsTimeseries> {
    return this.analytics.getTimeseries(query.period);
  }

  /** Dispositivos: navegador, SO y tamaño de pantalla (GoatCounter). */
  @Get('devices')
  getDevices(@Query() query: PeriodQueryDto): Promise<AnalyticsDevices> {
    return this.analytics.getDevices(query.period);
  }
}
