import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsPeriod } from './dto/period-query.dto';
import { GoatCounterService } from './goatcounter.service';
import { CloudflareService } from './cloudflare.service';
import type {
  AnalyticsActionSeries,
  AnalyticsDevices,
  AnalyticsEvents,
  AnalyticsSummary,
  AnalyticsTimeseries,
  AnalyticsVitals,
  MetricRange,
} from './analytics.types';

/** Días que cubre cada periodo predefinido. */
const PERIOD_DAYS: Record<AnalyticsPeriod, number> = {
  [AnalyticsPeriod.Day]: 1,
  [AnalyticsPeriod.Week]: 7,
  [AnalyticsPeriod.Month]: 30,
  [AnalyticsPeriod.Quarter]: 90,
};

/**
 * Orquesta la analítica: combina GoatCounter + Cloudflare y cachea cada resultado en Postgres
 * (MetricSnapshot) para respetar los rate limits de los proveedores y responder rápido.
 */
@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  /** TTL de la caché de snapshots (10 min). */
  private readonly cacheTtlMs = 10 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly goatcounter: GoatCounterService,
    private readonly cloudflare: CloudflareService,
  ) {}

  /** Resumen combinado (GoatCounter + Cloudflare), por fuente. */
  async getSummary(period: AnalyticsPeriod, customRange?: MetricRange): Promise<AnalyticsSummary> {
    const { key, range } = this.resolve(period, customRange);
    const cached = await this.readCache<AnalyticsSummary>('combined', key);
    if (cached) return cached;

    const [gc, cf] = await Promise.allSettled([
      this.goatcounter.getSummary(range),
      this.cloudflare.getSummary(range),
    ]);
    const goatcounter = gc.status === 'fulfilled' ? gc.value : null;
    const cloudflare = cf.status === 'fulfilled' ? cf.value : null;

    const payload: AnalyticsSummary = {
      ...this.meta(key, range, goatcounter === null || cloudflare === null),
      goatcounter,
      cloudflare,
    };
    await this.writeCache('combined', key, payload);
    return payload;
  }

  /** Eventos (los provee GoatCounter): descargas, donaciones, idioma, demo, showcase, scroll… */
  async getEvents(period: AnalyticsPeriod, customRange?: MetricRange): Promise<AnalyticsEvents> {
    const { key, range } = this.resolve(period, customRange);
    const cached = await this.readCache<AnalyticsEvents>('events', key);
    if (cached) return cached;

    const events = await this.goatcounter.getEvents(range);

    const payload: AnalyticsEvents = {
      ...this.meta(key, range, events === null),
      events: events ?? [],
    };
    await this.writeCache('events', key, payload);
    return payload;
  }

  /** Serie temporal diaria por fuente (visitas/páginas por día). */
  async getTimeseries(period: AnalyticsPeriod, customRange?: MetricRange): Promise<AnalyticsTimeseries> {
    const { key, range } = this.resolve(period, customRange);
    const cached = await this.readCache<AnalyticsTimeseries>('timeseries', key);
    if (cached) return cached;

    const [gc, cf] = await Promise.allSettled([
      this.goatcounter.getTimeseries(range),
      this.cloudflare.getTimeseries(range),
    ]);
    const goatcounter = gc.status === 'fulfilled' ? gc.value : null;
    const cloudflare = cf.status === 'fulfilled' ? cf.value : null;

    const payload: AnalyticsTimeseries = {
      ...this.meta(key, range, goatcounter === null || cloudflare === null),
      goatcounter,
      cloudflare,
    };
    await this.writeCache('timeseries', key, payload);
    return payload;
  }

  /** Dispositivos (navegador · SO · tamaño de pantalla), de GoatCounter. */
  async getDevices(period: AnalyticsPeriod, customRange?: MetricRange): Promise<AnalyticsDevices> {
    const { key, range } = this.resolve(period, customRange);
    const cached = await this.readCache<AnalyticsDevices>('devices', key);
    if (cached) return cached;

    const devices = await this.goatcounter.getDevices(range);

    const payload: AnalyticsDevices = {
      ...this.meta(key, range, devices === null),
      browsers: devices?.browsers ?? [],
      systems: devices?.systems ?? [],
      sizes: devices?.sizes ?? [],
    };
    await this.writeCache('devices', key, payload);
    return payload;
  }

  /** Rendimiento de carga (FCP, tiempo total) desde Cloudflare RUM. */
  async getVitals(period: AnalyticsPeriod, customRange?: MetricRange): Promise<AnalyticsVitals> {
    const { key, range } = this.resolve(period, customRange);
    const cached = await this.readCache<AnalyticsVitals>('vitals', key);
    if (cached) return cached;

    const vitals = await this.cloudflare.getVitals(range);

    const payload: AnalyticsVitals = {
      ...this.meta(key, range, vitals === null),
      fcp: vitals?.fcp ?? null,
      loadTime: vitals?.loadTime ?? null,
    };
    await this.writeCache('vitals', key, payload);
    return payload;
  }

  /** Serie diaria por evento (top N), de GoatCounter. */
  async getActionSeries(period: AnalyticsPeriod, customRange?: MetricRange): Promise<AnalyticsActionSeries> {
    const { key, range } = this.resolve(period, customRange);
    const cached = await this.readCache<AnalyticsActionSeries>('action-series', key);
    if (cached) return cached;

    const events = await this.goatcounter.getEventSeries(range);

    const payload: AnalyticsActionSeries = {
      ...this.meta(key, range, events === null),
      events: events ?? [],
    };
    await this.writeCache('action-series', key, payload);
    return payload;
  }

  // --- Helpers ---

  /** Campos comunes de toda respuesta de analítica. */
  private meta(period: string, range: MetricRange, partial: boolean) {
    return { period, range, updatedAt: new Date().toISOString(), partial };
  }

  /**
   * Resuelve la clave de caché y el rango de fechas. Si `customRange` trae un rango válido
   * (start ≤ end) se usa con clave `start_end`; si no, el preset `period` (comportamiento previo).
   */
  private resolve(
    period: AnalyticsPeriod,
    customRange?: MetricRange,
  ): { key: string; range: MetricRange } {
    if (customRange && customRange.start && customRange.end && customRange.start <= customRange.end) {
      return { key: `${customRange.start}_${customRange.end}`, range: customRange };
    }
    return { key: period, range: this.resolveRange(period) };
  }

  /** Devuelve el snapshot cacheado si está dentro del TTL; si no, null. */
  private async readCache<T>(
    source: string,
    period: string,
  ): Promise<T | null> {
    const cached = await this.prisma.metricSnapshot.findFirst({
      where: { source, period },
      orderBy: { createdAt: 'desc' },
    });
    if (cached && Date.now() - cached.createdAt.getTime() < this.cacheTtlMs) {
      return cached.payload as unknown as T;
    }
    return null;
  }

  /** Persiste un snapshot (caché + histórico). Best-effort: no rompe si falla. */
  private async writeCache(
    source: string,
    period: string,
    payload: unknown,
  ): Promise<void> {
    try {
      await this.prisma.metricSnapshot.create({
        data: { source, period, payload: payload as Prisma.InputJsonValue },
      });
    } catch (error) {
      this.logger.warn(
        `No se pudo guardar el snapshot (${source}): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /** Convierte un periodo predefinido en un rango de fechas (YYYY-MM-DD). */
  private resolveRange(period: AnalyticsPeriod): MetricRange {
    const end = new Date();
    const start = new Date(
      end.getTime() - PERIOD_DAYS[period] * 24 * 60 * 60 * 1000,
    );
    const fmt = (d: Date): string => d.toISOString().slice(0, 10);
    return { start: fmt(start), end: fmt(end) };
  }
}
