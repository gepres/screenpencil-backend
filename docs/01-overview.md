# 01 — Visión y alcance

## Qué es

`screenpencil-backend` es la **API central** del ecosistema **ScreenPencil**. Empieza resolviendo
un problema concreto y está diseñada para **crecer** sin reescribirse.

- **Stack:** NestJS 11 (TypeScript) · PostgreSQL en **Neon** · **Prisma** ORM.
- **Rol:** punto único de backend. Guarda los **secretos** (tokens de APIs externas, BD) y expone
  endpoints seguros a los clientes (la landing y, en el futuro, la app de escritorio).

## Capacidad inicial: Analytics admin

El panel `/admin` de la landing necesita ver la analítica **sin exponer tokens** en el navegador.
Este backend:

1. Llama a **GoatCounter** (API REST) — eventos y páginas.
2. Llama a **Cloudflare Web Analytics** (API GraphQL) — visitas, países, fuentes.
3. **Agrega** ambos y devuelve un JSON unificado a `/admin`.
4. **Cachea** los resultados (Postgres/memoria) para respetar rate limits y responder rápido.

Detalle en [06 — Integración de analítica](06-analytics-integration.md).

## A quién sirve

- **La landing** (`/admin`): consume `GET /analytics/...` con una API key.
- **La app de escritorio** (futuro): podría usar el backend para releases, telemetría opcional, etc.
- **El equipo** (gepres): un único backend que centraliza integraciones y datos.

## Roadmap (orientativo)

| Fase | Alcance | Estado |
|------|---------|--------|
| **F1 — Base** | Esqueleto Nest, Config tipada, Prisma+Neon, health check. | ✅ |
| **F2 — Analytics** | `AnalyticsModule`: GoatCounter + Cloudflare + agregación + caché + API key. Endpoints `summary`/`events`/`timeseries`. | ✅ **en producción** (Render) |
| **F3 — Persistencia** | Snapshots de métricas en Postgres (`MetricSnapshot`, caché con TTL ~10 min). | 🟡 caché ✅; histórico de largo plazo: parcial |
| **F4 — Auth real** | `AuthModule` (JWT / sesiones) para el panel admin, multiusuario. | ⏳ |
| **F5 — Más dominios** | Releases/actualizaciones de la app, donaciones, etc. (según necesidad). | ⏳ |

## Fuera de alcance (por ahora)
- No reemplaza a GoatCounter/Cloudflare; los **agrega**.
- No sirve la web (eso es `screenpencil-landing`).
- No incluye panel de UI propio en el backend (la UI vive en la landing).

## Principios de producto
- **Gratis y de bajo costo:** Neon free tier + hosting con free/low tier (ver [08](08-deployment.md)).
- **Privacidad:** analítica sin cookies en origen; el backend no añade tracking intrusivo.
- **Escalar por módulos**, no por reescrituras.
