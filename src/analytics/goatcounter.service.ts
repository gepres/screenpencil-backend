import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import type {
  DeviceRow,
  EventItem,
  MetricRange,
  ProviderSummary,
  SeriesPoint,
} from './analytics.types';

// --- Formas (parciales) de las respuestas de la API de GoatCounter (verificadas en vivo) ---
// /stats/total -> { total }, /stats/hits -> { hits:[{path,count,event}] },
// /stats/toprefs y /stats/locations -> { stats:[{id,name,count}] }
interface GcTotal {
  total?: number;
  total_events?: number;
  // /stats/total trae el desglose diario: cada día con 24 valores horarios.
  stats?: { day?: string; hourly?: number[] }[];
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

  /** Eventos (los `event:true` de /stats/hits): descargas, donaciones, idioma, demo, showcase… */
  async getEvents(range: MetricRange): Promise<EventItem[] | null> {
    if (!this.isConfigured()) return null;
    try {
      const hits = await this.get<GcHitsResponse>('/stats/hits', {
        start: range.start,
        end: range.end,
      });
      return (hits.hits ?? [])
        .filter((h) => h.event)
        .map((h) => ({ name: h.path ?? '(desconocido)', count: h.count ?? 0 }))
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      this.logger.warn(
        `GoatCounter (eventos) no respondió: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  /** Serie diaria de páginas vistas (suma de las 24 horas de cada día de /stats/total). */
  async getTimeseries(range: MetricRange): Promise<SeriesPoint[] | null> {
    if (!this.isConfigured()) return null;
    try {
      const total = await this.get<GcTotal>('/stats/total', {
        start: range.start,
        end: range.end,
      });
      return (total.stats ?? []).map((d) => ({
        date: d.day ?? '',
        views: (d.hourly ?? []).reduce((sum, h) => sum + (h || 0), 0),
        // Desglose horario (24 valores) para el heatmap del panel.
        hourly: d.hourly ?? [],
      }));
    } catch (error) {
      this.logger.warn(
        `GoatCounter (serie) no respondió: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  /** Dispositivos: navegador, sistema operativo y tamaño de pantalla (top 10 c/u). */
  async getDevices(range: MetricRange): Promise<{
    browsers: DeviceRow[];
    systems: DeviceRow[];
    sizes: DeviceRow[];
  } | null> {
    if (!this.isConfigured()) return null;
    try {
      const params = { start: range.start, end: range.end };
      const [browsers, systems, sizes] = await Promise.all([
        this.get<GcStatsResponse>('/stats/browsers', params),
        this.get<GcStatsResponse>('/stats/systems', params),
        this.get<GcStatsResponse>('/stats/sizes', params),
      ]);
      const map = (r: GcStatsResponse): DeviceRow[] =>
        (r.stats ?? []).slice(0, 10).map((s) => ({
          name: s.name?.trim() ? s.name : '(desconocido)',
          count: s.count ?? 0,
        }));
      return {
        browsers: map(browsers),
        systems: map(systems),
        sizes: map(sizes),
      };
    } catch (error) {
      this.logger.warn(
        `GoatCounter (dispositivos) no respondió: ${error instanceof Error ? error.message : String(error)}`,
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
