import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Protege los endpoints admin: exige la cabecera `x-api-key` igual a `ADMIN_API_KEY`.
 * Si la clave no está configurada en el servidor, deniega (fail-closed).
 * Es una protección simple para la fase actual; en F4 se migrará a auth real (JWT/Access).
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | undefined> }>();
    const provided = request.headers['x-api-key'];
    const expected = this.config.get<string>('admin.apiKey');

    if (!expected) {
      throw new UnauthorizedException(
        'ADMIN_API_KEY no configurada en el servidor.',
      );
    }
    if (!provided || provided !== expected) {
      throw new UnauthorizedException(
        'API key inválida o ausente (cabecera x-api-key).',
      );
    }
    return true;
  }
}
