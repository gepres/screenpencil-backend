# 08 — Despliegue

Dos piezas independientes: **la base de datos** (Neon) y **la API** (un host con Node).

## 1) Base de datos — Neon
- Crea el proyecto en neon.tech (free tier). Copia la **connection string** (con `?sslmode=require`).
- Usa **branches de Neon** por entorno: una rama para producción, otra para desarrollo.
- Migraciones en CI/CD: `npx prisma migrate deploy` (usa la cadena **directa**, sin pooler).
- Runtime de la API: usa la cadena **con pooler** (PgBouncer) para no agotar conexiones.

## 2) API — opciones de hosting (Node)
La API NestJS necesita un host con Node. Opciones (free/low cost):

| Host | Notas |
|------|-------|
| **Railway** ⭐ | Despliegue desde repo, env vars sencillas, build Node automático. (Créditos, no free perpetuo.) |
| **Render** | Web Service Node; free tier (con cold start) o instancias baratas. |
| **Fly.io** | Contenedor; buen free/low cost, regiones cercanas. |

> Recomendado para empezar: **Railway** (o Render). Mantén el host de la API y Neon separados.

## Pasos genéricos
1. Conecta el repo al host.
2. **Build:** `npm ci && npm run build` · **Start:** `node dist/main` (o `npm run start:prod`).
3. Configura las **variables de entorno** (las de [`.env.example`](../.env.example)) en el panel del host.
4. Paso de **migraciones** en el deploy: `npx prisma migrate deploy` antes de arrancar.
5. `prisma generate` debe correr en el build (el `postinstall` de Prisma suele hacerlo).

## Configuración de la API en producción
- `NODE_ENV=production`.
- `CORS_ORIGIN` = dominio real de la landing (p. ej. `https://gepres.github.io`).
- `DATABASE_URL` = cadena **con pooler** de Neon.
- Tokens (`GOATCOUNTER_TOKEN`, `CLOUDFLARE_API_TOKEN`, `ADMIN_API_KEY`) como **secrets** del host.

## Conectar la landing
- La landing (`/admin`) llama a `https://<api-host>/analytics/...` con la cabecera `x-api-key`.
- Si `/admin` corre en el navegador, la API key quedaría visible → en F4 conviene mover a **auth real**
  (JWT/sesión) o poner la API detrás de **Cloudflare Access**. Documentar al implementar.

## Checklist de release
- [ ] `build` + `lint` + `test` en verde.
- [ ] Migraciones aplicadas (`migrate deploy`).
- [ ] Variables de entorno completas en el host.
- [ ] CORS apuntando al dominio real.
- [ ] `/health` responde 200.
