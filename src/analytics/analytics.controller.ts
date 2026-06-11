import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { AnalyticsService } from './analytics.service';
import { PeriodQueryDto } from './dto/period-query.dto';
import type {
  AnalyticsActionSeries,
  AnalyticsDevices,
  AnalyticsEvents,
  AnalyticsSummary,
  AnalyticsTimeseries,
  AnalyticsVitals,
  MetricRange,
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

  /** Rango personalizado si llegan `start` y `end`; si no, undefined (usa el preset). */
  private range(q: PeriodQueryDto): MetricRange | undefined {
    return q.start && q.end ? { start: q.start, end: q.end } : undefined;
  }

  /** Resumen combinado (GoatCounter + Cloudflare) del periodo indicado. */
  @Get('summary')
  getSummary(@Query() query: PeriodQueryDto): Promise<AnalyticsSummary> {
    return this.analytics.getSummary(query.period, this.range(query));
  }

  /** Acciones/eventos de GoatCounter (descargas, donaciones, idioma, demo, showcase, scroll…). */
  @Get(['events', 'actions'])
  getEvents(@Query() query: PeriodQueryDto): Promise<AnalyticsEvents> {
    return this.analytics.getEvents(query.period, this.range(query));
  }

  /** Serie temporal diaria (visitas/páginas por día), por fuente. */
  @Get('timeseries')
  getTimeseries(@Query() query: PeriodQueryDto): Promise<AnalyticsTimeseries> {
    return this.analytics.getTimeseries(query.period, this.range(query));
  }

  /** Dispositivos: navegador, SO y tamaño de pantalla (GoatCounter). */
  @Get('devices')
  getDevices(@Query() query: PeriodQueryDto): Promise<AnalyticsDevices> {
    return this.analytics.getDevices(query.period, this.range(query));
  }

  /** Rendimiento de carga (FCP, tiempo total) desde Cloudflare RUM. */
  @Get('vitals')
  getVitals(@Query() query: PeriodQueryDto): Promise<AnalyticsVitals> {
    return this.analytics.getVitals(query.period, this.range(query));
  }

  /** Serie diaria por evento (top N), de GoatCounter. */
  @Get('action-series')
  getActionSeries(@Query() query: PeriodQueryDto): Promise<AnalyticsActionSeries> {
    return this.analytics.getActionSeries(query.period, this.range(query));
  }
}
