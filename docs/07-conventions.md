# 07 — Convenciones de código

## Idioma
- **Prosa, comentarios y docs: español.**
- **Identificadores, tipos, endpoints, env vars: inglés.**

## Estructura de un feature module
```
src/<feature>/
  <feature>.module.ts
  <feature>.controller.ts      # HTTP; sin lógica de negocio
  <feature>.service.ts         # lógica; testeable
  dto/                         # DTOs de entrada/salida (class-validator)
  <provider>.service.ts        # (si aplica) cliente de API externa encapsulado
  <feature>.service.spec.ts    # unit tests
```

## Reglas
1. **Controllers finos**: validan (DTO), delegan al service, devuelven. Nada de `axios`/`prisma` directo en el controller.
2. **Servicios puros de lógica**: dependencias por inyección (constructor). Fáciles de mockear.
3. **DTOs validados**: `class-validator` + `ValidationPipe` global con `whitelist: true` y `transform: true`.
4. **Errores**: lanza `HttpException` (o subclases) con mensajes claros; un *exception filter* da forma uniforme al JSON de error.
5. **Nada de `any`** salvo justificación; tipa las respuestas externas con interfaces.
6. **Sin secretos en logs**; sin `console.log` (usa el `Logger` de Nest).
7. **Async/await** siempre; maneja rechazos. Llamadas externas con timeout.
8. **Una responsabilidad por archivo**; funciones cortas.

## Naming
- Ficheros: `kebab-case` (`analytics.service.ts`).
- Clases/Tipos: `PascalCase` (`AnalyticsService`, `SummaryDto`).
- Variables/métodos: `camelCase`.
- Endpoints REST: sustantivos en plural, `kebab-case` (`/analytics/top-pages`).
- Modelos Prisma: `PascalCase` singular; campos `camelCase`.

## Git
- Rama por feature; commits pequeños y descriptivos (en español está bien).
- No subir `.env`, `dist/`, `node_modules/`, `prisma` generado.
- PR pasa: `build` + `lint` + `test` en verde.

## Definición de "terminado"
- Compila, lint y tests en verde.
- Migración creada si cambió el esquema.
- `.env.example` y docs actualizados si hay nueva config.
- Lo no probado/TODO, declarado explícitamente.
