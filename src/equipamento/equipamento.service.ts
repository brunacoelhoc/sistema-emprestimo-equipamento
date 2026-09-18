import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CriarEquipamentoDto } from './dto/criar-equipamento.dto';
import {
  calcularPaginacao,
  OpcoesPaginacao,
} from '../common/utils/paginacao.util';

@Injectable()
export class EquipamentoService {
  constructor(private readonly prisma: PrismaService) {}

  // Cadastra um equipamento novo (ativo e disponivel por padrao)
  criar(dto: CriarEquipamentoDto) {
    return this.prisma.equipamento.create({ data: dto });
  }

  // Lista os equipamentos; com page/limit, aplica paginacao; com
  // ativo/emprestado, filtra so quem bate com o valor informado
  listarTodos(
    opcoes?: OpcoesPaginacao & { ativo?: boolean; emprestado?: boolean },
  ) {
    return this.prisma.equipamento.findMany({
      where: {
        ...(opcoes?.ativo !== undefined && { ativo: opcoes.ativo }),
        ...(opcoes?.emprestado !== undefined && {
          emprestado: opcoes.emprestado,
        }),
      },
      ...calcularPaginacao(opcoes),
    });
  }
}
