import { Exclude } from 'class-transformer';
import { ApiHideProperty } from '@nestjs/swagger';
import { Role } from '../../../generated/prisma/enums';

// Modela a resposta publica de um Usuario. @Exclude garante que "senha"
// nunca aparece na saida da API, mesmo se um novo endpoint esquecer de
// remove-la manualmente (o ClassSerializerInterceptor aplica isso sozinho).
// @ApiHideProperty tira o campo da documentacao do Swagger tambem
// (@Exclude sozinho so afeta a serializacao em runtime, nao a doc).
export class UsuarioRespostaDto {
  id: number;
  nome: string;
  email: string;
  role: Role;
  criadoEm: Date;

  @Exclude()
  @ApiHideProperty()
  senha: string;

  constructor(parcial: Partial<UsuarioRespostaDto>) {
    Object.assign(this, parcial);
  }
}
