import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();

  const found = await prisma.user.findUnique({
    where: { id: user.sub },
    include: { psychologist: true },
  });

  if (!found) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

  const { password: _, ...safe } = found;
  return NextResponse.json(safe);
}
