import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Única puerta a la base de datos. Envuelve el PrismaClient y gestiona la conexión/desconexión
 * con el ciclo de vida de Nest.
 *
 * Prisma 7: la conexión llega por un *driver adapter* (@prisma/adapter-pg), no por `url` en el
 * schema. La cadena viene de la config tipada (DATABASE_URL). Ver docs/04-database.md.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService) {
    const connectionString = config.getOrThrow<string>('database.url');
    super({ adapter: new PrismaPg({ connectionString }) });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Conectado a PostgreSQL (Prisma + adapter-pg).');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
