import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { Role } from '../generated/prisma/enums';

// Cria um ADMIN padrao se ainda nao existir, pra nao depender do endpoint
// publico de registro (que aceita role=ADMIN) so pra ter o primeiro admin.
async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const emailAdmin = 'admin@sistema.com';
  const senhaPadrao = 'admin123';

  const adminExistente = await prisma.usuario.findUnique({
    where: { email: emailAdmin },
  });

  if (adminExistente) {
    console.log('Admin padrao ja existe, nada a fazer.');
    await prisma.$disconnect();
    return;
  }

  const senhaHash = await bcrypt.hash(senhaPadrao, 10);

  await prisma.usuario.create({
    data: {
      nome: 'Administrador',
      email: emailAdmin,
      senha: senhaHash,
      role: Role.ADMIN,
    },
  });

  console.log(`Admin criado: ${emailAdmin} / senha: ${senhaPadrao}`);
  await prisma.$disconnect();
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
