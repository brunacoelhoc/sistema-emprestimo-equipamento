export interface OpcoesPaginacao {
  page?: number;
  limit?: number;
}

// Traduz page/limit pro skip/take do Prisma. Retorna undefined quando nenhum
// dos dois foi enviado, preservando o comportamento padrao (retornar tudo).
export function calcularPaginacao(opcoes?: OpcoesPaginacao) {
  if (!opcoes?.page && !opcoes?.limit) {
    return undefined;
  }

  const limite = Math.min(opcoes?.limit ?? 10, 100);
  const pagina = Math.max(opcoes?.page ?? 1, 1);

  return { skip: (pagina - 1) * limite, take: limite };
}
