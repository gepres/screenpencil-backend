import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import type {
  MetricRange,
  ProviderSummary,
  SeriesPoint,
} from './analytics.types';

const GRAPHQL_URL = 'https://api.cloudflare.com/client/v4/graphql';

// Consulta RUM de Web Analytics (verificada en vivo). OJO: `siteTag` NO es el token del beacon;
// es el tag del dataset RUM (descubrible agrupando por `dimensions { siteTag }`).
const RUM_QUERY = `
query Rum($account: String!, $site: String!, $start: String!, $end: String!) {
  viewer {
    accounts(filter: { accountTag: $account }) {
      total: rumPageloadEventsAdaptiveGroups(
        limit: 1
        filter: { siteTag: $site, date_geq: $start, date_leq: $end }
      ) { count sum { visits } }
      topPages: rumPageloadEventsAdaptiveGroups(
        limit: 10, orderBy: [count_DESC]
        filter: { siteTag: $site, date_geq: $start, date_leq: $end }
      ) { count dimensions { requestPath } }
      countries: rumPageloadEventsAdaptiveGroups(
        limit: 10, orderBy: [count_DESC]
        filter: { siteTag: $site, date_geq: $start, date_leq: $end }
      ) { count dimensions { countryName } }
      referrers: rumPageloadEventsAdaptiveGroups(
        limit: 10, orderBy: [count_DESC]
        filter: { siteTag: $site, date_geq: $start, date_leq: $end }
      ) { count dimensions { refererHost } }
    }
  }
}`;

// Consulta de serie diaria (visitas/páginas por día).
const TIMESERIES_QUERY = `
query RumDaily($account: String!, $site: String!, $start: String!, $end: String!) {
  viewer {
    accounts(filter: { accountTag: $account }) {
      byDay: rumPageloadEventsAdaptiveGroups(
        limit: 1000, orderBy: [date_ASC]
        filter: { siteTag: $site, date_geq: $start, date_leq: $end }
      ) { count sum { visits } dimensions { date } }
    }
  }
}`;

interface CfGroup {
  count?: number;
  sum?: { visits?: number };
  dimensions?: {
    requestPath?: string;
    countryName?: string;
    refererHost?: string;
    date?: string;
  };
}
interface CfAccount {
  total?: CfGroup[];
  topPages?: CfGroup[];
  countries?: CfGroup[];
  referrers?: CfGroup[];
  byDay?: CfGroup[];
}
interface CfResponse {
  data?: { viewer?: { accounts?: CfAccount[] } };
  errors?: { message?: string }[];
}

/**
 * Cliente del GraphQL Analytics API de Cloudflare (dataset RUM de Web Analytics).
 * Encapsula endpoint, auth (Bearer) y mapeo a `ProviderSummary`.
 */
@Injectable()
export class CloudflareService {
  private readonly logger = new Logger(CloudflareService.name);
  private readonly apiToken: string;
  private readonly accountId: string;
  private readonly siteTag: string;

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.apiToken = config.get<string>('cloudflare.apiToken') ?? '';
    this.accountId = config.get<string>('cloudflare.accountId') ?? '';
    this.siteTag = config.get<string>('cloudflare.siteTag') ?? '';
  }

  isConfigured(): boolean {
    return Boolean(this.apiToken && this.accountId && this.siteTag);
  }

  async getSummary(range: MetricRange): Promise<ProviderSummary | null> {
    if (!this.isConfigured()) return null;
    try {
      const response = await firstValueFrom(
        this.http.post<CfResponse>(
          GRAPHQL_URL,
          {
            query: RUM_QUERY,
            variables: {
              account: this.accountId,
              site: this.siteTag,
              start: range.start,
              end: range.end,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${this.apiToken}`,
              'Content-Type': 'application/json',
            },
            timeout: 8000,
          },
        ),
      );

      const body = response.data;
      if (body.errors?.length) {
        this.logger.warn(
          `Cloudflare GraphQL devolvió errores: ${body.errors[0]?.message}`,
        );
        return null;
      }

      const account = body.data?.viewer?.accounts?.[0];
      const total = account?.total?.[0];

      return {
        totals: {
          pageviews: total?.count ?? 0,
          visits: total?.sum?.visits ?? 0,
        },
        topPages: (account?.topPages ?? []).map((g) => ({
          path: g.dimensions?.requestPath ?? '(desconocido)',
          views: g.count ?? 0,
        })),
        countries: (account?.countries ?? []).map((g) => ({
          name: g.dimensions?.countryName,
          views: g.count ?? 0,
        })),
        referrers: (account?.referrers ?? []).map((g) => ({
          host: g.dimensions?.refererHost?.trim()
            ? g.dimensions.refererHost
            : '(directo)',
          views: g.count ?? 0,
        })),
      };
    } catch (error) {
      this.logger.warn(
        `Cloudflare no respondió: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  /** Serie diaria de páginas vistas y visitas (dataset RUM agrupado por día). */
  async getTimeseries(range: MetricRange): Promise<SeriesPoint[] | null> {
    if (!this.isConfigured()) return null;
    try {
      const response = await firstValueFrom(
        this.http.post<CfResponse>(
          GRAPHQL_URL,
          {
            query: TIMESERIES_QUERY,
            variables: {
              account: this.accountId,
              site: this.siteTag,
              start: range.start,
              end: range.end,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${this.apiToken}`,
              'Content-Type': 'application/json',
            },
            timeout: 8000,
          },
        ),
      );
      const body = response.data;
      if (body.errors?.length) {
        this.logger.warn(
          `Cloudflare GraphQL (serie) devolvió errores: ${body.errors[0]?.message}`,
        );
        return null;
      }
      const days = body.data?.viewer?.accounts?.[0]?.byDay ?? [];
      return days.map((g) => ({
        date: g.dimensions?.date ?? '',
        views: g.count ?? 0,
        visits: g.sum?.visits ?? 0,
      }));
    } catch (error) {
      this.logger.warn(
        `Cloudflare (serie) no respondió: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }
}
