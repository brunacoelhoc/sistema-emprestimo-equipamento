import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CriarEquipamentoDto {
  @ApiProperty({ example: 'Notebook Dell Latitude 5440' })
  @IsString({ message: 'O nome do equipamento deve ser um texto.' })
  nome: string;

  @ApiPropertyOptional({
    example: 'Notebook i5, 16GB RAM, para uso em campo',
  })
  @IsOptional()
  @IsString({ message: 'A descricao deve ser um texto.' })
  descricao?: string;
}
