import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsuarioAutenticado } from '../../common/interfaces/usuario-autenticado.interface';

// Valida o JWT (assinatura e expiracao) e monta o request.user
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: { sub: number; role: string }): UsuarioAutenticado {
    return {
      id: payload.sub,
      role: payload.role as UsuarioAutenticado['role'],
    };
  }
}
