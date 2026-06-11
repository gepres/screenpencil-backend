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

/** Un evento de GoatCounter (descargas, donaciones, idioma, demo, showcase, scroll…). */
export interface EventItem {
  name: string;
  count: number;
}

/** Respuesta de /analytics/events (los eventos los provee GoatCounter). */
export interface AnalyticsEvents {
  period: string;
  range: MetricRange;
  updatedAt: string;
  partial: boolean;
  events: EventItem[];
}

/** Un punto diario de la serie temporal. */
export interface SeriesPoint {
  date: string; // YYYY-MM-DD
  views: number;
  visits?: number;
  /** Desglose horario del día (24 valores). Lo provee GoatCounter; alimenta el heatmap. */
  hourly?: number[];
}

/** Una fila del desglose de dispositivos (navegador, SO o tamaño de pantalla). */
export interface DeviceRow {
  name: string;
  count: number;
}

/** Respuesta de /analytics/devices (navegador · SO · tamaño de pantalla; de GoatCounter). */
export interface AnalyticsDevices {
  period: string;
  range: MetricRange;
  updatedAt: string;
  partial: boolean;
  browsers: DeviceRow[];
  systems: DeviceRow[];
  sizes: DeviceRow[];
}

/** Respuesta de /analytics/timeseries (serie por día, por fuente). */
export interface AnalyticsTimeseries {
  period: string;
  range: MetricRange;
  updatedAt: string;
  partial: boolean;
  goatcounter: SeriesPoint[] | null;
  cloudflare: SeriesPoint[] | null;
}
