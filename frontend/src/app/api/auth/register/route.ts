import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, forbidden } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();
  if (user.role !== 'ADMIN') return forbidden();

  const { name, email, password, role, specialty } = await request.json();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: 'E-mail já cadastrado' }, { status: 409 });

  const hashed = await bcrypt.hash(password, 12);

  const created = await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      role: role ?? 'RECEPTIONIST',
      ...(role === 'PSYCHOLOGIST' && specialty
        ? { psychologist: { create: { specialty } } }
        : {}),
    },
  });

  return NextResponse.json(
    { id: created.id, name: created.name, email: created.email, role: created.role },
    { status: 201 }
  );
}
