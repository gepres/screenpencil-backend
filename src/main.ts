import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Validación global de DTOs: descarta campos no declarados y transforma tipos.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // CORS: en desarrollo reflejamos cualquier origen (facilita probar el /admin local);
  // en producción, solo los orígenes configurados (la landing).
  const isProd = config.get<string>('nodeEnv') === 'production';
  const origins = config.get<string[]>('corsOrigin') ?? [];
  app.enableCors({ origin: isProd ? (origins.length ? origins : false) : true });

  // Cierra conexiones (Prisma) limpiamente al apagar.
  app.enableShutdownHooks();

  const port = config.get<number>('port') ?? 3000;
  // 0.0.0.0: necesario para que el host/contenedor (Render, Railway, Docker) exponga el puerto.
  await app.listen(port, '0.0.0.0');
}
void bootstrap();
