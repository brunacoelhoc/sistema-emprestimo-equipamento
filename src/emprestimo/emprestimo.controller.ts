import {
  Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiConflictResponse, ApiCreatedResponse, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { EmprestimoService } from './emprestimo.service';
import { CriarEmprestimoDto } from './dto/criar-emprestimo.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UsuarioAutenticado } from '../common/interfaces/usuario-autenticado.interface';
import { StatusEmprestimo } from '../../generated/prisma/enums';

@ApiTags('Loans')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente, invalido ou expirado.' })
// sem RolesGuard aqui de proposito: qualquer usuario autenticado (USER ou
// ADMIN) pode retirar/devolver equipamento, diferente do Equipment (admin-only)
@Controller('loans')
@UseGuards(JwtAuthGuard)
export class EmprestimoController {
  constructor(private readonly emprestimoService: EmprestimoService) {}

  @ApiOperation({ summary: 'Retira um equipamento disponível (cria um emprestimo)' })
  @ApiCreatedResponse({ description: 'Emprestimo criado com sucesso.' })
  @ApiBadRequestResponse({ description: 'equipamentoId inválido ou ausente.' })
  @ApiNotFoundResponse({ description: 'Equipamento não encontrado.' })
  @ApiConflictResponse({
    description: 'Equipamento inativo ou já emprestado.',
  })
  @Post()
  criar(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Body() dto: CriarEmprestimoDto,
  ) {
    return this.emprestimoService.criar(usuario.id, dto);
  }

  @ApiOperation({ summary: 'Devolve um emprestimo (dono do emprestimo ou ADMIN)' })
  @ApiParam({ name: 'id', description: 'ID do emprestimo', example: 1 })
  @ApiOkResponse({ description: 'Devolucao registrada com sucesso.' })
  @ApiForbiddenResponse({
    description: 'Emprestimo nao pertence ao usuário autenticado.',
  })
  @ApiNotFoundResponse({ description: 'Emprestimo não encontrado.' })
  @ApiConflictResponse({ description: 'Emprestimo já foi devolvido.' })
  @Patch(':id/return')
  devolver(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id', ParseIntPipe) id: number,
  ) {
    // usuario.role vai pro service pra permitir ADMIN devolver
    // emprestimo de outra pessoa, sem abrir essa excecao pra qualquer USER
    return this.emprestimoService.devolver(usuario.id, usuario.role, id);
  }

  @ApiOperation({
    summary:
      'Lista os emprestimos do usuario autenticado (paginacao via page/limit, filtro via status)',
  })
  @ApiOkResponse({ description: 'Lista de emprestimos do usuário autenticado.' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'status', required: false, enum: StatusEmprestimo })
  @Get('my')
  listarMeus(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    // "|| undefined" cobre string vazia/ausente/NaN de uma vez so;
    // sem page/limit o service devolve a lista inteira (sem paginar).
    // status invalido (fora do enum) e simplesmente ignorado, nao quebra a rota
    const statusValido = Object.values(StatusEmprestimo).includes(
      status as StatusEmprestimo,
    )
      ? (status as StatusEmprestimo)
      : undefined;

    return this.emprestimoService.listarMeus(usuario.id, {
      page: Number(page) || undefined,
      limit: Number(limit) || undefined,
      status: statusValido,
    });
  }
}
