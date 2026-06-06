import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import type { MetricRange, ProviderSummary } from './analytics.types';

// --- Formas (parciales) de las respuestas de la API de GoatCounter (verificadas en vivo) ---
// /stats/total -> { total }, /stats/hits -> { hits:[{path,count,event}] },
// /stats/toprefs y /stats/locations -> { stats:[{id,name,count}] }
interface GcTotal {
  total?: number;
  total_events?: number;
}
interface GcHit {
  path?: string;
  count?: number;
  event?: boolean; // GoatCounter mezcla páginas y eventos en /stats/hits; este flag los distingue.
}
interface GcHitsResponse {
  hits?: GcHit[];
}
interface GcStat {
  id?: string;
  name?: string;
  count?: number;
}
interface GcStatsResponse {
  stats?: GcStat[];
}

/**
 * Cliente de la API REST de GoatCounter. Encapsula URL base, auth (Bearer) y el mapeo de
 * respuestas a `ProviderSummary`. Base: https://{site}.goatcounter.com/api/v0
 */
@Injectable()
export class GoatCounterService {
  private readonly logger = new Logger(GoatCounterService.name);
  private readonly site: string;
  private readonly token: string;

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.site = config.get<string>('goatcounter.site') ?? '';
    this.token = config.get<string>('goatcounter.token') ?? '';
  }

  /** ¿Hay site + token configurados? Si no, el AnalyticsService la salta (partial). */
  isConfigured(): boolean {
    return Boolean(this.site && this.token);
  }

  private get baseUrl(): string {
    return `https://${this.site}.goatcounter.com/api/v0`;
  }

  async getSummary(range: MetricRange): Promise<ProviderSummary | null> {
    if (!this.isConfigured()) return null;
    try {
      const params = { start: range.start, end: range.end };
      const [total, hits, refs, locs] = await Promise.all([
        this.get<GcTotal>('/stats/total', params),
        this.get<GcHitsResponse>('/stats/hits', params),
        this.get<GcStatsResponse>('/stats/toprefs', params),
        this.get<GcStatsResponse>('/stats/locations', params),
      ]);

      return {
        totals: {
          pageviews: total.total ?? 0,
          // GoatCounter no separa "visits" en /stats/total; lo dejamos en 0 (usar Cloudflare para visitas).
          visits: 0,
        },
        // Solo páginas reales (event:false); los eventos van aparte (flow/*, showcase/*…).
        topPages: (hits.hits ?? [])
          .filter((h) => !h.event)
          .slice(0, 10)
          .map((h) => ({
            path: h.path ?? '(desconocido)',
            views: h.count ?? 0,
          })),
        referrers: (refs.stats ?? []).slice(0, 10).map((r) => ({
          host: r.name?.trim() ? r.name : '(directo)',
          views: r.count ?? 0,
        })),
        countries: (locs.stats ?? [])
          .slice(0, 10)
          .map((l) => ({ code: l.id, name: l.name, views: l.count ?? 0 })),
      };
    } catch (error) {
      this.logger.warn(
        `GoatCounter no respondió: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  private async get<T>(
    path: string,
    params: Record<string, string>,
  ): Promise<T> {
    const response = await firstValueFrom(
      this.http.get<T>(`${this.baseUrl}${path}`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        params,
        timeout: 8000,
      }),
    );
    return response.data;
  }
}
