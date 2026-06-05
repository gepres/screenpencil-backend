# 09 — Testing

Jest (unit) + Supertest (e2e), ambos vienen con NestJS.

## Pirámide
- **Unit (la mayoría):** servicios con dependencias **mockeadas** (clientes externos, Prisma).
  Aquí vive la lógica de agregación de analítica → testear casos: ambas fuentes ok, una falla
  (`partial: true`), caché golpea/expira, rangos de fecha.
- **e2e (pocos, clave):** levantan la app (`Test.createTestingModule`) y golpean los endpoints con
  Supertest. Mockean las APIs externas (no pegarle a GoatCounter/Cloudflare reales en tests).
- **Sin tests contra servicios externos reales** en CI (flaky, rate limits). Usa mocks/fixtures.

## Convenciones
- `*.spec.ts` junto al archivo (unit); `test/*.e2e-spec.ts` (e2e).
- Mockea `GoatCounterService` y `CloudflareService` al testear `AnalyticsService`.
- Para Prisma: mock del `PrismaService` (o una BD de test dedicada en e2e con una rama Neon de prueba).
- Apunta a cubrir la **lógica de negocio** (agregación, caché, tolerancia a fallos), no el framework.

## Comandos
```bash
npm test            # unit
npm run test:watch  # unit en watch
npm run test:cov    # cobertura
npm run test:e2e    # e2e
```

## Objetivo
- Cobertura razonable en `AnalyticsService` y los clientes (mapeo de respuestas).
- Todo PR: tests en verde antes de mergear.
