import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();

  const appointment = await prisma.appointment.findUnique({
    where: { id: params.id },
    include: {
      patient: true,
      psychologist: { include: { user: true } },
      slot: true,
    },
  });

  if (!appointment)
    return NextResponse.json({ error: 'Consulta não encontrada' }, { status: 404 });

  return NextResponse.json(appointment);
}
