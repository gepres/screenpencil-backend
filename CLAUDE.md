# CLAUDE.md — Guía para Claude Code (screenpencil-backend)

Este archivo se carga en cada sesión. Mantenlo **conciso**; la profundidad vive en `docs/`.

## Qué es este proyecto

**Backend / API** del ecosistema **ScreenPencil** (la app de escritorio vive en `screenpencil-app`;
la web en `screenpencil-landing`). Construido con **NestJS 11 + TypeScript**.

**Primera capacidad:** *Analytics admin* — agrega los datos de **GoatCounter** (REST) y
**Cloudflare Web Analytics** (GraphQL) y los expone como una API unificada que consume el panel
`/admin` de la landing. Diseñado para **crecer** (auth, más endpoints, persistencia).

**Stack:** NestJS 11 · PostgreSQL (**Neon**, serverless) · **Prisma** ORM · `@nestjs/config`.
Ver [`docs/00-INDEX.md`](docs/00-INDEX.md) para el mapa completo.

## Decisiones ya tomadas
- **Base de datos:** **PostgreSQL en Neon** + **Prisma** (ver [ADR-0001](docs/adr/0001-postgres-neon-prisma.md)). No Firebase, no Supabase.
- **Idioma:** **prosa y comentarios en español**; **identificadores, tipos y APIs en inglés**.
- **Secretos** (tokens de GoatCounter/Cloudflare, `DATABASE_URL`) van **solo en variables de entorno**, nunca en el repo ni en el cliente.
- **El backend es el único que habla con las APIs externas** (guarda los tokens); la landing solo llama a este backend.

## Reglas de trabajo (importantes)
1. **Arquitectura modular de Nest**: una carpeta por *feature module* (`analytics/`, `health/`, futuro `auth/`). Nada de lógica en el `AppModule`. Ver [`docs/02-architecture.md`](docs/02-architecture.md).
2. **Capas**: `Controller → Service → (PrismaService | cliente de API externa)`. Los controllers no contienen lógica de negocio. DTOs validados con `class-validator`.
3. **Config tipada y validada**: toda variable de entorno pasa por `@nestjs/config` con validación de esquema. Nunca leer `process.env` suelto fuera de la config. Ver [`docs/05-configuration.md`](docs/05-configuration.md).
4. **Prisma es la única vía a la BD**: `PrismaService` inyectable; migraciones con `prisma migrate`. Ver [`docs/04-database.md`](docs/04-database.md).
5. **Respeta los rate limits** de las APIs externas: cachea (en Postgres o memoria) los snapshots de analítica. Ver [`docs/06-analytics-integration.md`](docs/06-analytics-integration.md).
6. **Construye incremental y valida**: `npm run build` sin errores, `npm run lint` y `npm test` en verde antes de dar algo por terminado.

## Estructura objetivo
```
src/
  main.ts                # bootstrap, CORS, ValidationPipe global
  app.module.ts          # raíz: importa Config, Prisma, feature modules
  config/                # configuración tipada + validación de env
  prisma/                # PrismaModule + PrismaService
  analytics/             # GoatCounterService, CloudflareService, AnalyticsService, controller, DTOs
  health/                # health checks
  common/                # guards, interceptors, filters, decorators compartidos
prisma/
  schema.prisma          # modelos (Prisma)
  migrations/            # generadas por prisma migrate
docs/                    # documentación (ver docs/00-INDEX.md)
.claude/skills/          # skills del proyecto (estándares)
```

## Comandos
```bash
npm run start:dev        # API en watch (http://localhost:3000)
npm run build            # compila a dist/
npm run lint             # ESLint
npm test                 # unit (Jest)
npx prisma migrate dev   # crea/aplica migración en local
npx prisma studio        # explorador visual de la BD
npx prisma generate      # regenera el cliente tipado
```

## Antes de dar algo por terminado
- `npm run build` + `npm run lint` + `npm test` en verde.
- Si tocaste el esquema de Prisma: hay migración creada y `prisma generate` corrido.
- Secretos nuevos: añadidos a `.env.example` (sin valores) y documentados en [`docs/05-configuration.md`](docs/05-configuration.md).
- Reporta fielmente lo que quedó como TODO o sin probar.
