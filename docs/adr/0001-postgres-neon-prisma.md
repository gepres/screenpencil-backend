# ADR-0001 — PostgreSQL en Neon + Prisma

- **Estado:** Aceptada
- **Fecha:** 2026-06-05
- **Contexto:** El backend necesita persistencia para cachear snapshots de analítica y crecer
  (auth, más dominios). Restricción del equipo: **no Firebase ni Supabase**.

## Decisión
Usar **PostgreSQL** como motor, hospedado en **Neon**, con **Prisma** como ORM.

## Alternativas consideradas
- **Railway Postgres** — cómodo (DB + API juntos) pero sin free tier perpetuo (créditos).
- **MongoDB Atlas (Mongoose)** — free M0 perpetuo, pero NoSQL encaja peor con datos relacionales y consultas analíticas.
- **Turso (libSQL/Drizzle)** — ligero y al edge, pero ecosistema Nest menos maduro.
- **Supabase / Firebase** — descartados por requisito del equipo.

## Razones
- **Postgres**: relacional, estándar, escalable, ideal para datos estructurados y consultas.
- **Neon**: Postgres **serverless**, free tier **real y perpetuo**, escala a cero, *branching* tipo git
  (rama por entorno), distinto de Supabase.
- **Prisma**: esquema declarativo, migraciones versionadas y **cliente tipado** (type-safety con Nest/TS).

## Consecuencias
- Migraciones versionadas en git (`prisma migrate`); nada de cambios manuales en la BD.
- Dos cadenas de conexión en Neon: **directa** (migraciones) y **con pooler** (runtime serverless).
- Si se necesitara multi-tenant fuerte o edge-first, reevaluar (ver Turso). Por ahora, Postgres cubre.
