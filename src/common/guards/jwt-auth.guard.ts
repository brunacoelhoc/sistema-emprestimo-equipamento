import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Exige um JWT valido no header Authorization pra liberar a rota
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // sobrescreve a mensagem padrao do Passport ("Unauthorized", em ingles)
  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser,
    _info: unknown,
    _context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      throw new UnauthorizedException(
        'Token de autenticacao ausente, invalido ou expirado.',
      );
    }
    return user;
  }
}
