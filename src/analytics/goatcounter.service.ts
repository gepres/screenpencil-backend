import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import type { MetricRange, ProviderSummary } from './analytics.types';

// --- Formas (parciales) de las respuestas de la API de GoatCounter ---
// TODO(verificar): confirmar los nombres de campos contra respuestas reales con un token.
interface GcTotal {
  total?: number;
  total_events?: number;
}
interface GcHit {
  path?: string;
  count?: number;
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
          // TODO(verificar): GoatCounter no separa "visits" en /stats/total; refinar al ver datos.
          visits: 0,
        },
        topPages: (hits.hits ?? []).slice(0, 10).map((h) => ({
          path: h.path ?? '(desconocido)',
          views: h.count ?? 0,
        })),
        referrers: (refs.stats ?? []).slice(0, 10).map((r) => ({
          host: r.name ?? r.id ?? '(desconocido)',
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
