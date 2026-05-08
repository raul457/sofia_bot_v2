import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const psychologists = await prisma.psychologist.findMany({
    include: { user: { select: { name: true, email: true } } },
  });
  return NextResponse.json(psychologists);
}
