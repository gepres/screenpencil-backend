/**
 * Configuración tipada de la app. Mapea las variables de entorno (ya validadas por
 * env.validation.ts) a un objeto estructurado. Se carga en ConfigModule.forRoot({ load }).
 * Regla del proyecto: NUNCA leer process.env fuera de este archivo.
 */
export interface AppConfiguration {
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  corsOrigin: string[];
  database: { url: string };
  goatcounter: { site: string; token: string };
  cloudflare: { apiToken: string; accountId: string; siteTag: string };
  admin: { apiKey: string };
}

export default (): AppConfiguration => ({
  nodeEnv:
    (process.env.NODE_ENV as AppConfiguration['nodeEnv']) ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  // Coma-separados → lista de orígenes permitidos para CORS.
  corsOrigin: (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  database: {
    url: process.env.DATABASE_URL ?? '',
  },
  goatcounter: {
    site: process.env.GOATCOUNTER_SITE ?? '',
    token: process.env.GOATCOUNTER_TOKEN ?? '',
  },
  cloudflare: {
    apiToken: process.env.CLOUDFLARE_API_TOKEN ?? '',
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? '',
    siteTag: process.env.CLOUDFLARE_SITE_TAG ?? '',
  },
  admin: {
    apiKey: process.env.ADMIN_API_KEY ?? '',
  },
});
