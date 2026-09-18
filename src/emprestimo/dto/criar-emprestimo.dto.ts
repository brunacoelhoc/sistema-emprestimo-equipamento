import { IsInt, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CriarEmprestimoDto {
  @ApiProperty({ example: 1 })
  @IsInt({ message: 'O equipamentoId deve ser um numero inteiro.' })
  @IsPositive({ message: 'O equipamentoId deve ser um numero positivo.' })
  equipamentoId: number;
}
