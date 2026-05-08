import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();

  const patient = await prisma.patient.findUnique({
    where: { id: params.id },
    include: {
      appointments: {
        include: {
          psychologist: { include: { user: { select: { name: true } } } },
          slot: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!patient) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
  return NextResponse.json(patient);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();

  const data = await request.json();

  const patient = await prisma.patient.update({
    where: { id: params.id },
    data: {
      ...data,
      ...(data.birthDate ? { birthDate: new Date(data.birthDate) } : {}),
    },
  });

  return NextResponse.json(patient);
}
