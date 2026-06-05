import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsPeriod } from './dto/period-query.dto';
import { GoatCounterService } from './goatcounter.service';
import { CloudflareService } from './cloudflare.service';
import type { AnalyticsSummary, MetricRange } from './analytics.types';

/** Días que cubre cada periodo predefinido. */
const PERIOD_DAYS: Record<AnalyticsPeriod, number> = {
  [AnalyticsPeriod.Day]: 1,
  [AnalyticsPeriod.Week]: 7,
  [AnalyticsPeriod.Month]: 30,
  [AnalyticsPeriod.Quarter]: 90,
};

/**
 * Orquesta la analítica: combina GoatCounter + Cloudflare y cachea el resultado en Postgres
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

  async getSummary(period: AnalyticsPeriod): Promise<AnalyticsSummary> {
    // 1) ¿Hay un snapshot reciente cacheado? -> devolverlo.
    const cached = await this.prisma.metricSnapshot.findFirst({
      where: { source: 'combined', period },
      orderBy: { createdAt: 'desc' },
    });
    if (cached && Date.now() - cached.createdAt.getTime() < this.cacheTtlMs) {
      return cached.payload as unknown as AnalyticsSummary;
    }

    // 2) Consultar ambas fuentes en paralelo (tolerante a fallos).
    const range = this.resolveRange(period);
    const [gcResult, cfResult] = await Promise.allSettled([
      this.goatcounter.getSummary(range),
      this.cloudflare.getSummary(range),
    ]);

    const goatcounter = gcResult.status === 'fulfilled' ? gcResult.value : null;
    const cloudflare = cfResult.status === 'fulfilled' ? cfResult.value : null;

    const payload: AnalyticsSummary = {
      period,
      range,
      updatedAt: new Date().toISOString(),
      partial: goatcounter === null || cloudflare === null,
      goatcounter,
      cloudflare,
    };

    // 3) Persistir el snapshot (caché + histórico). Best-effort: no romper si falla.
    try {
      await this.prisma.metricSnapshot.create({
        data: {
          source: 'combined',
          period,
          payload: payload as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      this.logger.warn(
        `No se pudo guardar el snapshot: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return payload;
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
