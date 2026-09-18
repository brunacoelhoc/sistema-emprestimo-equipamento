import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { EquipamentoService } from './equipamento.service';
import { CriarEquipamentoDto } from './dto/criar-equipamento.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/enums';

@ApiTags('Equipment')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente, invalido ou expirado.' })
@Controller('equipment')
@UseGuards(JwtAuthGuard)
export class EquipamentoController {
  constructor(private readonly equipamentoService: EquipamentoService) {}

  @ApiOperation({ summary: 'Cadastra um novo equipamento (somente ADMIN)' })
  @ApiCreatedResponse({ description: 'Equipamento criado com sucesso.' })
  @ApiBadRequestResponse({ description: 'Corpo da requisicao invalido.' })
  @ApiForbiddenResponse({ description: 'Usuario autenticado nao e ADMIN.' })
  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  criar(@Body() dto: CriarEquipamentoDto) {
    return this.equipamentoService.criar(dto);
  }

  @ApiOperation({
    summary:
      'Lista os equipamentos (paginacao via page/limit, filtros via ativo/emprestado)',
  })
  @ApiOkResponse({ description: 'Lista de equipamentos.' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'ativo', required: false, example: true })
  @ApiQuery({ name: 'emprestado', required: false, example: false })
  @Get()
  listarTodos(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('ativo') ativo?: string,
    @Query('emprestado') emprestado?: string,
  ) {
    // "|| undefined" cobre string vazia/ausente/NaN de uma vez so;
    // sem page/limit o service devolve a lista inteira (sem paginar)
    return this.equipamentoService.listarTodos({
      page: Number(page) || undefined,
      limit: Number(limit) || undefined,
      ativo: ativo === undefined ? undefined : ativo === 'true',
      emprestado: emprestado === undefined ? undefined : emprestado === 'true',
    });
  }
}
