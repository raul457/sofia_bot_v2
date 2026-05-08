import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('admin123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@clinicasofia.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@clinicasofia.com',
      password,
      role: 'ADMIN',
    },
  });

  const psiUser = await prisma.user.upsert({
    where: { email: 'psi@clinicasofia.com' },
    update: {},
    create: {
      name: 'Dra. Ana Oliveira',
      email: 'psi@clinicasofia.com',
      password,
      role: 'PSYCHOLOGIST',
      psychologist: {
        create: {
          specialty: 'Terapia Cognitivo-Comportamental',
          bio: 'Especialista em ansiedade e depressão.',
        },
      },
    },
    include: { psychologist: true },
  });

  console.log('Seed concluído!');
  console.log('Admin:', admin.email, '/ senha: admin123');
  console.log('Psicóloga:', psiUser.email, '/ senha: admin123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
