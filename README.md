# ScreenPencil — Backend / API

**Backend del ecosistema [ScreenPencil](https://gepres.github.io/screenpencil-landing/)** (la app gratuita
para dibujar y anotar sobre toda la pantalla). Construido con **NestJS 11 + TypeScript**.

> **Primera capacidad — _Analytics admin_:** agrega los datos de **GoatCounter** (REST) y **Cloudflare
> Web Analytics** (GraphQL), los **cachea** en Postgres y los expone como una **API unificada** que
> consume el panel `/admin` de la landing **sin exponer los tokens** en el navegador. Diseñado para
> **crecer** (auth real, releases, más dominios).

- **Estado:** **desplegado en producción** en Render → `https://screenpencil-backend.onrender.com`.
- **Stack:** NestJS 11 · TypeScript · **PostgreSQL** en **Neon** (serverless) · **Prisma 7** (`@prisma/adapter-pg`) · `@nestjs/config`.
- Documentación completa en [`docs/`](docs/00-INDEX.md) · guía para Claude Code en [`CLAUDE.md`](CLAUDE.md).

---

## Arquitectura en una línea

Módulos de Nest (`analytics/`, `health/`, futuro `auth/`) con capas **`Controller → Service → (PrismaService | cliente de API externa)`**.
El backend es el **único** que habla con GoatCounter/Cloudflare (guarda los tokens); la landing solo llama
a este backend. Ver [docs/02 — Arquitectura](docs/02-architecture.md).

## Endpoints

| Método | Ruta | Auth | Devuelve |
|--------|------|:----:|----------|
| `GET` | `/health` | — | Estado del servicio + BD (`{"status":"ok","db":"up"}`). |
| `GET` | `/analytics/summary?period=7d` | `x-api-key` | Resumen combinado (totales, top páginas, países, fuentes, eventos). |
| `GET` | `/analytics/events?period=7d` | `x-api-key` | Eventos de GoatCounter (descargas, donaciones, idioma, demo…). |
| `GET` | `/analytics/timeseries?period=30d` | `x-api-key` | Serie temporal de visitas/páginas por día. |

- Protegidos por `ApiKeyGuard` (cabecera `x-api-key` = `ADMIN_API_KEY`). `period` ∈ `24h｜7d｜30d｜90d`.
- **Tolerancia a fallos:** si una fuente falla, devuelve la otra + `partial:true` (no 500). Caché en
  Postgres (`MetricSnapshot`, TTL ~10 min). Detalle en [docs/06](docs/06-analytics-integration.md).

## Quick start

```bash
npm install
npx prisma generate                       # cliente tipado

# API en watch (usa un puerto libre; 3000 suele estar ocupado en local)
PORT=3333 ADMIN_API_KEY=mi-clave npm run start:dev

curl http://localhost:3333/health
curl -H "x-api-key: mi-clave" "http://localhost:3333/analytics/summary?period=7d"
```

Otros comandos: `npm run build` · `npm run lint` · `npm test` · `npx prisma studio` · `npx prisma migrate dev`.

## Configuración (variables de entorno)

Toda env se valida al arrancar (`@nestjs/config`); nada de `process.env` suelto. Secretos **solo** en el
entorno, nunca en el repo:
`DATABASE_URL`, `GOATCOUNTER_SITE`, `GOATCOUNTER_TOKEN`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`,
`CLOUDFLARE_SITE_TAG`, `ADMIN_API_KEY`, `CORS_ORIGIN`, `PORT`.
Detalle y `.env.example` en [docs/05 — Configuración](docs/05-configuration.md).

## Despliegue

**Render** (Web Service con Docker; `Dockerfile` + `render.yaml` incluidos). `prisma migrate deploy` corre
en el `prestart`; pega los secretos (`sync:false`) y verifica `/health`. Pasos en
[docs/08 — Despliegue](docs/08-deployment.md).

> Gotchas conocidos: Prisma 7 usa **driver adapter** (`@prisma/adapter-pg`, sin `url` en el schema); en
> Docker usar `npm install` (no `npm ci`: el lockfile de Windows omite opcionales de Linux como
> `@emnapi/*`); base `node:22-slim`. El `CLOUDFLARE_SITE_TAG` del GraphQL **no** es el token del beacon de
> la landing; `ADMIN_API_KEY` en **hex** (la base64 con `=` rompe la cabecera).

## Ecosistema

- **App de escritorio:** `screenpencil-app` (código privado) → vitrina de descargas `gepres/screenpencil-releases`.
- **Landing:** [`screenpencil-landing`](https://gepres.github.io/screenpencil-landing/) — consume el `/admin` de este backend.
- **Backend (este repo):** `screenpencil-backend`.

## Licencia

NestJS es [MIT](https://github.com/nestjs/nest/blob/master/LICENSE). Licencia del proyecto: por definir.
