import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [today, week, month, total, scheduled] = await prisma.$transaction([
    prisma.appointment.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.appointment.count({ where: { createdAt: { gte: startOfWeek } } }),
    prisma.appointment.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.appointment.count(),
    prisma.appointment.count({ where: { status: { in: ['SCHEDULED', 'CONFIRMED'] } } }),
  ]);

  return NextResponse.json({ today, week, month, total, scheduled });
}
