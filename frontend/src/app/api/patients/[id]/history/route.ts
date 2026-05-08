import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();

  const patient = await prisma.patient.findUnique({ where: { id: params.id } });
  if (!patient) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

  const logs = await prisma.conversationLog.findMany({
    where: { phone: patient.phone },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(logs);
}
