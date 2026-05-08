import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('admin123', 12);

  await prisma.user.upsert({
    where: { email: 'admin@clinicasofia.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@clinicasofia.com',
      password,
      role: 'ADMIN',
    },
  });

  await prisma.user.upsert({
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
  });

  console.log('Seed concluído!');
  console.log('Admin: admin@clinicasofia.com / admin123');
  console.log('Psicóloga: psi@clinicasofia.com / admin123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
