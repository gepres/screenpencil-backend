import * as Joi from 'joi';

/**
 * Esquema de validación de las variables de entorno. Si una variable REQUERIDA falta o es
 * inválida, la app NO arranca (fail-fast). Las de analítica son opcionales por ahora y pasarán
 * a requeridas cuando se conecte el AnalyticsModule (ver docs/05-configuration.md).
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  CORS_ORIGIN: Joi.string().allow('').default(''),

  // --- Requerida: base de datos (Neon) ---
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgres', 'postgresql'] })
    .required(),

  // --- Opcionales por ahora (analítica) ---
  GOATCOUNTER_SITE: Joi.string().allow('').default(''),
  GOATCOUNTER_TOKEN: Joi.string().allow('').default(''),
  CLOUDFLARE_API_TOKEN: Joi.string().allow('').default(''),
  CLOUDFLARE_ACCOUNT_ID: Joi.string().allow('').default(''),
  CLOUDFLARE_SITE_TAG: Joi.string().allow('').default(''),
  ADMIN_API_KEY: Joi.string().allow('').default(''),
});
