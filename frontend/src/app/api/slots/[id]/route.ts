import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();

  const slot = await prisma.slot.findUnique({ where: { id: params.id } });
  if (!slot) return NextResponse.json({ error: 'Slot não encontrado' }, { status: 404 });
  if (slot.status === 'RESERVED')
    return NextResponse.json({ error: 'Não é possível excluir slot reservado' }, { status: 400 });

  await prisma.slot.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}
