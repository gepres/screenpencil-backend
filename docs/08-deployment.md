# 08 — Despliegue

Dos piezas independientes: **la base de datos** (Neon) y **la API** (un host con Node).

## 1) Base de datos — Neon
- Crea el proyecto en neon.tech (free tier). Copia la **connection string** (con `?sslmode=require`).
- Usa **branches de Neon** por entorno: una rama para producción, otra para desarrollo.
- Migraciones en CI/CD: `npx prisma migrate deploy` (usa la cadena **directa**, sin pooler).
- Runtime de la API: usa la cadena **con pooler** (PgBouncer) para no agotar conexiones.

## 2) API — host Node (Opción A elegida)

> Cloudflare Workers/Pages **no** sirven: son isolates, no Node, y `@prisma/adapter-pg` usa TCP.
> Por eso la API va en un **host Node**. El repo ya trae **`Dockerfile`** (portable) y **`render.yaml`**.

| Host | Notas |
|------|-------|
| **Render** ⭐ | Web Service con Docker; free tier (cold start). Blueprint `render.yaml` incluido. |
| **Railway** | Deploy desde repo (detecta el Dockerfile); por créditos, no free perpetuo. |
| **Fly.io** | Contenedor (usa el mismo Dockerfile); free/low cost. |

### Artefactos incluidos
- **`Dockerfile`** — build determinista (instala deps, `prisma generate` por postinstall, `nest build`).
  `CMD` = `npm run start:prod` → corre `prisma migrate deploy` (prestart) y luego `node dist/main`.
- **`render.yaml`** — blueprint de Render: define el servicio + variables (secretos con `sync:false`).
- **`package.json`** — `postinstall: prisma generate`, `prestart:prod: prisma migrate deploy`, `engines.node >=20`.

### Deploy en Render (recomendado)
1. Sube el repo a GitHub (ya está).
2. Render → **New → Blueprint** → elige el repo → detecta `render.yaml`.
3. Render pedirá los **secretos** (`sync:false`): `DATABASE_URL`, `GOATCOUNTER_TOKEN`,
   `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_SITE_TAG`, `ADMIN_API_KEY`. Pégalos.
4. Deploy. Quedará en `https://screenpencil-backend.onrender.com` (o el nombre que asigne).
5. Verifica `https://<url>/health` → `{"status":"ok","db":"up"}`.

### Deploy en Railway (alternativa)
- New Project → Deploy from GitHub repo → detecta el `Dockerfile`. Añade las mismas variables en
  *Variables*. Railway expone el puerto vía `PORT` (la app lo lee).

## Configuración de la API en producción
- `NODE_ENV=production` · `CORS_ORIGIN=https://gepres.github.io` (origen de la landing).
- `DATABASE_URL`: usa la cadena **directa** de Neon (no la del pooler). En un host con instancia
  persistente (Render/Railway) la conexión directa es la adecuada y evita problemas de `migrate` con PgBouncer.
- Tokens y `ADMIN_API_KEY` como **secrets** del host (nunca en el repo).

## Conectar la landing (`/admin`)
- El `/admin` de la landing tiene un form (⚙) donde se pone la **URL del backend** y la **API key**
  (se guardan en `localStorage`). Tras desplegar, pon ahí `https://<api-host>` y la `ADMIN_API_KEY`.
- Asegúrate de que `CORS_ORIGIN` en el host = el origen de la landing (`https://gepres.github.io`).
- La API key vive en el navegador (limitación de un panel estático). En F4 conviene **auth real**
  (JWT/sesión) o poner la API detrás de **Cloudflare Access**.

## Checklist de release
- [ ] `build` + `lint` + `test` en verde.
- [ ] Migraciones aplicadas (`migrate deploy`).
- [ ] Variables de entorno completas en el host.
- [ ] CORS apuntando al dominio real.
- [ ] `/health` responde 200.
