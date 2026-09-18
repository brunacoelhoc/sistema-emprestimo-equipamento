import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CriarEmprestimoDto } from './dto/criar-emprestimo.dto';
import { StatusEmprestimo } from '../../generated/prisma/enums';
import {
  calcularPaginacao,
  OpcoesPaginacao,
} from '../common/utils/paginacao.util';

@Injectable()
export class EmprestimoService {
  constructor(private readonly prisma: PrismaService) {}

  // Retira um equipamento: valida se existe e se esta disponivel, depois
  // cria o emprestimo e marca o equipamento como emprestado numa transacao
  // (as duas escritas acontecem juntas ou nenhuma acontece)
  async criar(usuarioId: number, dto: CriarEmprestimoDto) {
    const equipamento = await this.prisma.equipamento.findUnique({
      where: { id: dto.equipamentoId },
    });

    if (!equipamento) {
      throw new NotFoundException('Equipamento nao encontrado.');
    }

    if (!equipamento.ativo || equipamento.emprestado) {
      throw new ConflictException(
        'Equipamento inativo ou ja emprestado nao pode ser retirado.',
      );
    }

    const [emprestimo] = await this.prisma.$transaction([
      this.prisma.emprestimo.create({
        data: { usuarioId, equipamentoId: equipamento.id },
      }),
      this.prisma.equipamento.update({
        where: { id: equipamento.id },
        data: { emprestado: true },
      }),
    ]);

    return emprestimo;
  }

  // Devolve um emprestimo: confere dono/ADMIN e se ja nao foi devolvido,
  // depois atualiza o emprestimo e libera o equipamento numa transacao
  async devolver(usuarioId: number, role: string, emprestimoId: number) {
    const emprestimo = await this.prisma.emprestimo.findUnique({
      where: { id: emprestimoId },
    });

    if (!emprestimo) {
      throw new NotFoundException('Emprestimo nao encontrado.');
    }

    if (emprestimo.usuarioId !== usuarioId && role !== 'ADMIN') {
      throw new ForbiddenException(
        'Voce so pode devolver seus proprios emprestimos.',
      );
    }

    if (emprestimo.status === StatusEmprestimo.DEVOLVIDO) {
      throw new ConflictException('Este emprestimo ja foi devolvido.');
    }

    const [emprestimoAtualizado] = await this.prisma.$transaction([
      this.prisma.emprestimo.update({
        where: { id: emprestimo.id },
        data: { status: StatusEmprestimo.DEVOLVIDO, dataDevolucao: new Date() },
      }),
      this.prisma.equipamento.update({
        where: { id: emprestimo.equipamentoId },
        data: { emprestado: false },
      }),
    ]);

    return emprestimoAtualizado;
  }

  // Lista so os emprestimos do usuario logado, mais recente primeiro
  listarMeus(usuarioId: number, opcoes?: OpcoesPaginacao) {
    return this.prisma.emprestimo.findMany({
      where: { usuarioId },
      orderBy: { dataRetirada: 'desc' },
      ...calcularPaginacao(opcoes),
    });
  }
}
