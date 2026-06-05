import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

/**
 * Módulo de health checks. PrismaService llega vía el PrismaModule global.
 */
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
