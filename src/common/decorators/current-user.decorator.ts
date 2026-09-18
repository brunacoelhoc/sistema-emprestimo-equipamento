import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Pega o usuario autenticado (preenchido pelo JwtStrategy) direto no controller,
// pra nunca precisar confiar num userId enviado pelo cliente
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
