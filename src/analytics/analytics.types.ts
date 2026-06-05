/**
 * Tipos normalizados de analítica. Cada proveedor (GoatCounter, Cloudflare) mapea su respuesta
 * cruda a `ProviderSummary`; el AnalyticsService combina ambos en `AnalyticsSummary`.
 */

/** Rango de fechas (YYYY-MM-DD) resuelto desde el `period`. */
export interface MetricRange {
  start: string;
  end: string;
}

/** Resumen normalizado de UNA fuente. */
export interface ProviderSummary {
  totals: { pageviews: number; visits: number };
  topPages: { path: string; views: number }[];
  countries: { code?: string; name?: string; views: number }[];
  referrers: { host: string; views: number }[];
}

/**
 * Respuesta combinada que sirve el endpoint /analytics/summary. Las fuentes van por separado
 * (GoatCounter y Cloudflare miden la misma web → no se suman para no duplicar páginas vistas).
 */
export interface AnalyticsSummary {
  period: string;
  range: MetricRange;
  updatedAt: string;
  /** true si alguna fuente no respondió o no está configurada. */
  partial: boolean;
  goatcounter: ProviderSummary | null;
  cloudflare: ProviderSummary | null;
}
