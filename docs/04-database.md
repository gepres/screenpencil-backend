# 04 — Base de datos (PostgreSQL · Neon · Prisma)

Decisión: **PostgreSQL en Neon + Prisma** ([ADR-0001](adr/0001-postgres-neon-prisma.md)). No Firebase, no Supabase.

## Neon (hosting)

- **Qué es:** Postgres **serverless** — escala a cero, *branching* tipo git, free tier perpetuo
  (≈ 0.5 GB, suficiente para arrancar).
- **Setup:** crea cuenta en neon.tech → New Project → copia la **connection string** (incluye
  `?sslmode=require`) → ponla en `DATABASE_URL` (ver [05](05-configuration.md)).
- **Branching:** crea una rama de BD por entorno (p. ej. `main` para prod, `dev` para desarrollo)
  para no mezclar datos.

## Prisma (ORM) — versión 7

> Usamos **Prisma 7**, que cambia respecto a versiones previas:
> - Generador **`prisma-client`** (no `prisma-client-js`), que emite el cliente a **`generated/prisma`** (gitignored).
> - El cliente se importa desde **`generated/prisma/client`**, no desde `@prisma/client`.
> - La URL de la BD se inyecta vía **`prisma.config.ts`** (`process.env.DATABASE_URL`, con `dotenv`),
>   no con `url = env(...)` dentro de `schema.prisma`.

- **Esquema** en `prisma/schema.prisma` (fuente de verdad de los modelos).
- **Cliente tipado** generado con `npx prisma generate`.
- **Acceso:** SOLO vía `PrismaService` inyectable (envuelve `PrismaClient`, gestiona connect/disconnect).

```prisma
// prisma/schema.prisma (estado de arranque, ya creado)
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}
datasource db {
  provider = "postgresql"   // la URL llega desde prisma.config.ts
}

/// Snapshot cacheado de métricas agregadas (respeta rate limits de los proveedores).
model MetricSnapshot {
  id        String   @id @default(cuid())
  source    String   // "goatcounter" | "cloudflare" | "combined"
  period    String   // "7d" | "30d" | "2026-06" ...
  payload   Json     // resultado agregado tal cual se sirve a /admin
  createdAt DateTime @default(now())

  @@index([source, period, createdAt])
}
```

> En el `PrismaService` importa el cliente desde la ruta generada, p. ej.
> `import { PrismaClient } from '../../generated/prisma/client';`

## Migraciones

```bash
npx prisma migrate dev --name init     # crea y aplica en local; genera el cliente
npx prisma migrate deploy              # aplica migraciones pendientes en prod (CI/CD)
npx prisma studio                      # explorador visual
```

- **Nunca** edites la BD a mano: todo cambio de esquema = nueva migración versionada en git.
- `prisma migrate deploy` corre en el pipeline de despliegue (ver [08](08-deployment.md)).

## Convenciones de modelado
- Nombres de modelos en **PascalCase singular** (`MetricSnapshot`), campos en **camelCase**.
- IDs con `cuid()` (o `uuid()`); timestamps `createdAt`/`updatedAt`.
- Índices explícitos para las consultas frecuentes (`@@index`).
- `Json` para payloads flexibles (snapshots); columnas tipadas para lo que se consulta/filtra.

## Pooling (Neon + serverless)
- En entornos serverless usa la **connection string con pooling** de Neon (PgBouncer) para no agotar
  conexiones. Para migraciones usa la cadena **directa** (sin pooler). Neon documenta ambas.
