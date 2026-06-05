import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Validación global de DTOs: descarta campos no declarados y transforma tipos.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // CORS limitado a los orígenes configurados (la landing). Vacío => permitir todos (dev).
  const origins = config.get<string[]>('corsOrigin') ?? [];
  app.enableCors({ origin: origins.length ? origins : true });

  // Cierra conexiones (Prisma) limpiamente al apagar.
  app.enableShutdownHooks();

  const port = config.get<number>('port') ?? 3000;
  await app.listen(port);
}
void bootstrap();
