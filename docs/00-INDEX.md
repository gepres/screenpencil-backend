# 00 — Índice de documentación · screenpencil-backend

Documentación del **backend/API de ScreenPencil** (NestJS + PostgreSQL/Neon + Prisma).
Mantén estos documentos **concisos y actualizados**. La guía rápida vive en [`../CLAUDE.md`](../CLAUDE.md).

## Mapa

| Doc | Para qué |
|-----|----------|
| [01 — Visión y alcance](01-overview.md) | Qué es el backend, a quién sirve y su roadmap. |
| [02 — Arquitectura](02-architecture.md) | Módulos, capas y cómo escala. |
| [03 — Tech stack](03-tech-stack.md) | NestJS, Prisma, Postgres/Neon, librerías y por qué. |
| [04 — Base de datos](04-database.md) | PostgreSQL + Prisma + Neon: esquema, migraciones, convenciones. |
| [05 — Configuración](05-configuration.md) | Variables de entorno, validación y secretos. |
| [06 — Integración de analítica](06-analytics-integration.md) | GoatCounter (REST) + Cloudflare (GraphQL): diseño del `AnalyticsModule`. |
| [07 — Convenciones](07-conventions.md) | Estándares de código, estructura de módulos y naming. |
| [08 — Despliegue](08-deployment.md) | Neon (BD) + hosting de la API + CI/CD. |
| [09 — Testing](09-testing.md) | Estrategia de pruebas (unit / e2e). |
| [adr/](adr/) | Decisiones de arquitectura (ADR). |

## Principios

1. **Modular y por capas** — un *feature module* por dominio; controllers finos, lógica en servicios.
2. **Config tipada** — toda env validada al arrancar; cero `process.env` suelto.
3. **Secretos fuera del código** — tokens y `DATABASE_URL` solo en variables de entorno.
4. **El backend es el guardián de los tokens** — solo él habla con GoatCounter/Cloudflare; la landing llama a este backend.
5. **Escalable por defecto** — añadir una feature = añadir un módulo, sin tocar los demás.
6. **Español en prosa/comentarios; inglés en identificadores/tipos/APIs.**

## Repos hermanos
- `screenpencil-landing` — web pública (consume `/admin` de este backend).
- `screenpencil-app` (`screenbrush-windown`) — app de escritorio (.NET/WPF).
