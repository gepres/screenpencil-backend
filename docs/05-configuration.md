# 05 — Configuración (env + secretos)

Toda la configuración entra por **variables de entorno**, se **valida al arrancar** y se expone
**tipada** vía `@nestjs/config`. Nunca se lee `process.env` suelto fuera de `src/config`.

## Variables

Ver la plantilla completa en [`.env.example`](../.env.example). Resumen:

| Variable | Para qué | Secreto |
|----------|----------|:------:|
| `NODE_ENV` | `development` / `production` | no |
| `PORT` | Puerto del servidor (def. 3000) | no |
| `CORS_ORIGIN` | Origen(es) permitidos (la landing), coma-separados | no |
| `DATABASE_URL` | Conexión a Postgres/Neon (`sslmode=require`) | **sí** |
| `GOATCOUNTER_SITE` | Subdominio del sitio en GoatCounter | no |
| `GOATCOUNTER_TOKEN` | Token API (permiso *Read statistics*) | **sí** |
| `CLOUDFLARE_API_TOKEN` | Token API (*Account Analytics: Read*) | **sí** |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID de Cloudflare | semi |
| `CLOUDFLARE_SITE_TAG` | Site tag del Web Analytics | semi |
| `ADMIN_API_KEY` | Clave que envía `/admin` en `x-api-key` | **sí** |

## Reglas
1. **`.env` nunca se sube** (está en `.gitignore`). Solo se versiona `.env.example` (sin valores).
2. **Validación al boot**: si falta o es inválida una variable requerida, la app **no arranca**
   (mejor fallar rápido que en runtime). Esquema con `joi` (o `zod`).
3. **Acceso tipado**: inyecta el `ConfigService`/objeto de config; no uses `process.env` en servicios.
4. **Rotación**: si un token se filtra, se regenera en el proveedor y se actualiza la variable; el
   código no cambia.

## Patrón sugerido (`src/config`)
- `env.validation.ts` — esquema (joi/zod) con TODAS las variables y sus tipos/requeridos.
- `configuration.ts` — función que mapea `process.env` a un objeto tipado (`app`, `db`, `goatcounter`, `cloudflare`, `admin`).
- Se registran en `ConfigModule.forRoot({ isGlobal: true, validate, load: [configuration] })`.

## Entornos
- **Local:** `.env` en la raíz.
- **Producción:** variables en el panel del host (Railway/Render/Fly) — ver [08](08-deployment.md). Mismos nombres.
