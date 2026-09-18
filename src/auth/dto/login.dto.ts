import { IsEmail, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'maria.silva@empresa.com' })
  @IsEmail({}, { message: 'Informe um e-mail valido.' })
  email: string;

  @ApiProperty({ example: 'senha123' })
  @MinLength(6, { message: 'A senha deve ter pelo menos 6 caracteres.' })
  senha: string;
}
