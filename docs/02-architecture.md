# 02 — Arquitectura

## Visión general

NestJS modular. Cada **dominio** es un *feature module* autocontenido. El `AppModule` solo
**compone** (importa Config, Prisma y los feature modules); no contiene lógica.

```
                 ┌───────────────────────────────────────────┐
   Landing /admin │  HTTP (x-api-key)                          │
   ───────────────►            AppModule (Nest)                │
                 │   ├─ ConfigModule  (env tipada/validada)   │
                 │   ├─ PrismaModule  (PrismaService)         │
                 │   ├─ HealthModule  (/health)               │
                 │   └─ AnalyticsModule                       │
                 │        ├─ AnalyticsController  (HTTP)       │
                 │        ├─ AnalyticsService     (orquesta)   │
                 │        ├─ GoatCounterService   (REST) ──────┼──► GoatCounter API
                 │        └─ CloudflareService    (GraphQL) ───┼──► Cloudflare GraphQL
                 │            └─ caché → PrismaService ────────┼──► PostgreSQL (Neon)
                 └───────────────────────────────────────────┘
```

## Capas (regla de oro)

```
Controller  →  Service  →  { PrismaService | cliente de API externa }
   (HTTP)       (lógica)        (datos)
```

- **Controller**: traduce HTTP ↔ dominio. Valida entrada (DTOs + `class-validator`), llama al
  service, devuelve la respuesta. **Sin lógica de negocio.**
- **Service**: la lógica. Orquesta clientes externos y/o Prisma. Es lo que se testea en unit.
- **Cliente externo** (`GoatCounterService`, `CloudflareService`): encapsula UNA integración
  (su URL, auth, forma de respuesta). Aísla los detalles del proveedor.
- **PrismaService**: única puerta a la BD (ver [04](04-database.md)).

## Módulos

| Módulo | Responsabilidad |
|--------|-----------------|
| `ConfigModule` | Carga y **valida** las variables de entorno; expone config tipada. Global. |
| `PrismaModule` | Provee `PrismaService` (conexión + desconexión gestionadas). Global. |
| `HealthModule` | `GET /health` (liveness/readiness; comprueba la BD). |
| `AnalyticsModule` | Integra GoatCounter + Cloudflare, agrega y cachea; expone `/analytics/*`. |
| `common/` | Piezas transversales: `ApiKeyGuard`, interceptores, filtros de excepción, decoradores. |

## Cómo escala (añadir una feature)

1. `nest g module <feature>` + `nest g controller <feature>` + `nest g service <feature>`.
2. Define DTOs en `<feature>/dto/` (validados).
3. Si necesita BD: añade modelos a `prisma/schema.prisma` + migración; usa `PrismaService`.
4. Si llama a una API externa: crea un `<provider>Service` que la encapsule.
5. Impórtalo en `AppModule`. **No tocas los módulos existentes.**

## Transversales (cross-cutting)
- **Validación**: `ValidationPipe` global (whitelist + transform) en `main.ts`.
- **Errores**: filtro de excepciones uniforme → respuestas JSON consistentes.
- **Seguridad**: `ApiKeyGuard` (cabecera `x-api-key`) protege los endpoints admin; CORS limitado al
  origen de la landing. JWT real en F4 (ver [01](01-overview.md)).
- **Caché/rate-limit**: la analítica se cachea (TTL corto) antes de volver a pegarle a los proveedores.
- **Logging**: logger de Nest; sin volcar secretos.

## Por qué así
- **Aislar integraciones** en servicios dedicados permite testear con mocks y cambiar de proveedor
  sin tocar controllers.
- **Config tipada y BD por Prisma** dan límites claros y type-safety de punta a punta.
- **Módulos independientes** = el proyecto crece sumando, no reescribiendo.
