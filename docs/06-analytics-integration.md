# 06 — Integración de analítica (GoatCounter + Cloudflare)

El `AnalyticsModule` agrega dos fuentes y expone una API unificada para el panel `/admin` de la
landing. El backend guarda los tokens; la landing **nunca** los ve.

> **Estado (F2): implementado y en producción** (Render) — los **tres** endpoints (`summary`, `events`,
> `timeseries`) funcionan: agregan, cachean en Postgres (`MetricSnapshot`), toleran fallos y van
> protegidos por API key. Pendiente menor: afinar el **mapeo de campos** de cada proveedor contra
> respuestas reales (marcado `TODO(verificar)` en los servicios) y **tests** de `events`/`timeseries`.

## Endpoints

| Método | Ruta | Estado | Devuelve |
|--------|------|:------:|----------|
| `GET` | `/analytics/summary?period=7d` | ✅ | Resumen combinado por fuente (totales, top páginas, países, fuentes). |
| `GET` | `/analytics/timeseries?period=30d` | ✅ | Serie temporal de visitas/páginas por día (por fuente). |
| `GET` | `/analytics/events?period=7d` | ✅ | Eventos de GoatCounter (descargas, donaciones, idioma, demo…). |
| `GET` | `/health` | ✅ | Estado del servicio + BD. |

- Protegidos por `ApiKeyGuard` (cabecera `x-api-key` = `ADMIN_API_KEY`).
- `period` admite los presets `24h`, `7d` (def.), `30d`, `90d` (enum validado).

### Probar en local
```bash
# Arranca la API (puerto libre; 3000 puede estar ocupado por otro proyecto)
PORT=3333 ADMIN_API_KEY=mi-clave npm run start:dev

curl http://localhost:3333/health
curl -H "x-api-key: mi-clave" "http://localhost:3333/analytics/summary?period=7d"
```
Sin `x-api-key` válida → `401`. Con `GOATCOUNTER_*`/`CLOUDFLARE_*` vacíos, las fuentes salen `null`
y `partial:true` (el endpoint igual responde).

## Fuente A — GoatCounter (REST)

- **Base:** `https://{GOATCOUNTER_SITE}.goatcounter.com/api/v0`
- **Auth:** cabecera `Authorization: Bearer {GOATCOUNTER_TOKEN}` + `Content-Type: application/json`.
- **Endpoints útiles:**
  - `GET /stats/total` — totales (páginas vistas / visitantes) del rango.
  - `GET /stats/hits` — por path (páginas); `daily=true` da desglose por día.
  - `GET /stats/hits/{path_id}` — referrers de un path.
  - `GET /stats/{page}` — `browsers`, `systems`, `locations` (países), `sizes`.
  - `GET /paths` — listado de paths.
- **Rate limit:** ~4 req/s; cabeceras `X-Rate-Limit-*`. → **cachear** (ver más abajo).
- **Encapsulado en** `GoatCounterService` (su URL, auth y mapeo de respuesta).

## Fuente B — Cloudflare Web Analytics (GraphQL)

- **Endpoint:** `https://api.cloudflare.com/client/v4/graphql`
- **Auth:** `Authorization: Bearer {CLOUDFLARE_API_TOKEN}` (permiso *Account Analytics: Read*).
- **Dataset (RUM):** `rumPageloadEventsAdaptiveGroups`, dentro de
  `viewer.accounts(filter:{ accountTag: CLOUDFLARE_ACCOUNT_ID })`.
- **Filtros:** `siteTag = CLOUDFLARE_SITE_TAG`, `date_geq/date_leq` (o `datetime_*`).
- **Métricas:** `count` (páginas vistas), `sum { visits }`.
- **Dimensiones:** `date`, `requestPath`, `countryName`, `refererHost`.

```graphql
query Rum($account: String!, $site: String!, $start: Date!, $end: Date!) {
  viewer {
    accounts(filter: { accountTag: $account }) {
      total: rumPageloadEventsAdaptiveGroups(
        limit: 1
        filter: { siteTag: $site, date_geq: $start, date_leq: $end }
      ) { count sum { visits } }

      byDay: rumPageloadEventsAdaptiveGroups(
        limit: 1000, orderBy: [date_ASC]
        filter: { siteTag: $site, date_geq: $start, date_leq: $end }
      ) { count sum { visits } dimensions { date } }

      countries: rumPageloadEventsAdaptiveGroups(
        limit: 20, orderBy: [count_DESC]
        filter: { siteTag: $site, date_geq: $start, date_leq: $end }
      ) { count dimensions { countryName } }
    }
  }
}
```

> ⚠️ Verifica los nombres exactos de campos contra el **schema** real (introspección GraphQL) al
> implementar; Cloudflare ajusta datasets ocasionalmente. Encapsulado en `CloudflareService`.

## Agregación y caché

- `AnalyticsService` llama a ambos servicios **en paralelo** (`Promise.all`), normaliza y combina.
- **Caché obligatoria** (respeta rate limits y acelera `/admin`):
  - Mínimo: caché en memoria con TTL (p. ej. 5–15 min) por `(endpoint, period)`.
  - Mejor (F3): persistir `MetricSnapshot` en Postgres → histórico propio + resiliencia si un
    proveedor falla.
- **Tolerancia a fallos:** si una fuente falla, devuelve la otra + marca `partial: true` (no 500 total).

## Forma de respuesta (ejemplo `/analytics/summary`)
```jsonc
{
  "period": "7d",
  "updatedAt": "2026-06-05T12:00:00Z",
  "partial": false,
  "totals":   { "pageviews": 1234, "visits": 890 },
  "topPages": [ { "path": "/", "views": 700 } ],
  "countries":[ { "code": "PE", "views": 540 } ],
  "referrers":[ { "host": "google.com", "views": 210 } ],
  "events":   [ { "name": "download/windows", "count": 42 } ]
}
```
