import {
  IsEmail,
  IsEnum,
  IsOptional,
  MinLength,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../../generated/prisma/enums';

export class RegistrarUsuarioDto {
  @ApiProperty({ example: 'Maria Silva' })
  @IsString({ message: 'O nome deve ser um texto.' })
  nome: string;

  @ApiProperty({ example: 'maria.silva@empresa.com' })
  @IsEmail({}, { message: 'Informe um e-mail valido.' })
  email: string;

  @ApiProperty({ example: 'senha123', minLength: 6 })
  @MinLength(6, { message: 'A senha deve ter pelo menos 6 caracteres.' })
  senha: string;

  @ApiPropertyOptional({ enum: Role, example: Role.USER })
  @IsOptional()
  @IsEnum(Role, { message: 'O role deve ser USER ou ADMIN.' })
  role?: Role;
}
