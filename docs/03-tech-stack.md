# 03 — Tech stack

| Capa | Elección | Por qué |
|------|----------|---------|
| **Runtime** | Node.js LTS (≥ 20) | Requisito de NestJS 11. |
| **Framework** | **NestJS 11** (TypeScript) | Modular, DI nativa, testeable, estándar de la industria. |
| **Lenguaje** | TypeScript (strict) | Type-safety end-to-end. |
| **Base de datos** | **PostgreSQL** en **Neon** | Relacional, escalable; Neon = serverless, free tier real (ver [ADR-0001](adr/0001-postgres-neon-prisma.md)). |
| **ORM** | **Prisma** | Esquema declarativo, migraciones, **cliente tipado**. |
| **Config** | `@nestjs/config` + validación | Env tipada y validada al arrancar. |
| **HTTP cliente** | `@nestjs/axios` (Axios) o `fetch` nativo | Llamadas a GoatCounter (REST) y Cloudflare (GraphQL). |
| **Validación** | `class-validator` + `class-transformer` | DTOs declarativos. |
| **Tests** | Jest (unit) + Supertest (e2e) | Vienen con Nest. |
| **Lint/format** | ESLint + Prettier | Vienen con Nest. |

## Dependencias a añadir (cuando se implemente)

```bash
# Config + validación
npm i @nestjs/config
npm i class-validator class-transformer
# (esquema de env) una de estas: joi  ó  zod
npm i joi

# Prisma (ORM)
npm i -D prisma
npm i @prisma/client
npx prisma init --datasource-provider postgresql

# HTTP a APIs externas
npm i @nestjs/axios axios

# (opcional F3+) caché, throttling, health
npm i @nestjs/throttler @nestjs/terminus
```

> Mantén el `package.json` **mínimo**: añade una librería solo si resuelve algo real.

## Versionado
- NestJS 11 / Prisma 5+ / Node LTS. Fija versiones mayores; sube con cuidado y corriendo tests.

## Convención de idioma
- **Prosa, comentarios y docs en español.**
- **Identificadores, nombres de tipos, endpoints y variables de entorno en inglés.**
