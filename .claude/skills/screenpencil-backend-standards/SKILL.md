---
name: screenpencil-backend-standards
description: >-
  Use when writing, reviewing or refactoring code in the screenpencil-backend project
  (NestJS 11 + TypeScript + PostgreSQL/Neon + Prisma). Enforces its conventions: modular
  feature-module architecture, thin controllers / logic in services, typed & validated env
  config (no raw process.env), Prisma-only DB access via PrismaService, encapsulated external
  API clients (GoatCounter REST, Cloudflare GraphQL) with caching/rate-limit respect, DTO
  validation, Spanish prose + English identifiers, and the build/lint/test definition of done.
  Triggers on NestJS, Nest module/controller/service, Prisma, schema.prisma, migration, Neon,
  @nestjs/config, env vars, analytics, GoatCounter, Cloudflare GraphQL, DTO, ApiKeyGuard.
---

# screenpencil-backend — estándares

Backend/API del ecosistema ScreenPencil. **NestJS 11 + TypeScript + PostgreSQL (Neon) + Prisma.**
La documentación profunda vive en `docs/` (índice en `docs/00-INDEX.md`); esta skill es el
resumen accionable. La guía de sesión es `CLAUDE.md`.

## Reglas que NO se rompen

1. **Idioma:** prosa y comentarios en **español**; identificadores, tipos, endpoints y env vars en **inglés**.
2. **Arquitectura modular:** una feature = un módulo Nest autocontenido (`analytics/`, `health/`, futuro `auth/`).
   El `AppModule` solo compone; **nada** de lógica ahí.
3. **Capas:** `Controller → Service → (PrismaService | cliente de API externa)`.
   - Controllers **finos**: validan DTO, delegan, devuelven. Sin `axios`/`prisma` directo.
   - La lógica vive en services (testeables, deps por inyección).
4. **Config tipada:** toda variable de entorno pasa por `@nestjs/config` con validación de esquema
   (joi/zod) que **falla al arrancar** si algo falta. **Prohibido** `process.env` suelto fuera de `src/config`.
5. **BD solo por Prisma:** acceso vía `PrismaService` inyectable. Cambios de esquema = migración
   versionada (`prisma migrate`), nunca a mano. Modelos PascalCase singular, campos camelCase.
6. **Integraciones aisladas:** cada API externa en su propio `<provider>Service` (URL, auth, mapeo
   de respuesta encapsulados). Tipar las respuestas; nada de `any` sin justificar.
7. **Secretos:** tokens y `DATABASE_URL` solo en env; nunca en repo, logs ni respuestas. Añade
   cualquier secreto nuevo a `.env.example` (sin valor) y a `docs/05-configuration.md`.
8. **Validación + errores:** DTOs con `class-validator`; `ValidationPipe` global (`whitelist`,
   `transform`); `HttpException` + exception filter para JSON de error uniforme.
9. **Resiliencia de analítica:** `AnalyticsService` llama a GoatCounter y Cloudflare en paralelo,
   **cachea** (TTL / `MetricSnapshot` en Postgres) para respetar rate limits, y si una fuente falla
   devuelve la otra con `partial: true` (no 500 total).

## Al añadir una feature
1. `nest g module/controller/service <feature>`; DTOs en `<feature>/dto/`.
2. ¿BD? modelo en `prisma/schema.prisma` + `prisma migrate dev`; usa `PrismaService`.
3. ¿API externa? crea `<provider>.service.ts` que la encapsule.
4. Impórtalo en `AppModule`. No toques los módulos existentes.

## Definición de "terminado"
- `npm run build` + `npm run lint` + `npm test` en verde.
- Migración creada y `prisma generate` corrido si cambió el esquema.
- `.env.example` y `docs/` actualizados si hay nueva config.
- TODOs / lo no probado, declarados explícitamente.

## Referencias
- Arquitectura: `docs/02-architecture.md` · BD: `docs/04-database.md` · Config: `docs/05-configuration.md`
- Analítica (GoatCounter REST + Cloudflare GraphQL): `docs/06-analytics-integration.md`
- Convenciones completas: `docs/07-conventions.md` · Despliegue: `docs/08-deployment.md`
