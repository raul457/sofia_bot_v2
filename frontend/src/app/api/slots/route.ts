import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized } from '@/lib/auth';
import { addMinutes, format } from 'date-fns';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const date_from = searchParams.get('date_from');
  const psychologistId = searchParams.get('psychologistId');

  const slots = await prisma.slot.findMany({
    where: {
      ...(status ? { status: status as 'AVAILABLE' | 'RESERVED' | 'BLOCKED' } : {}),
      ...(date_from ? { date: { gte: new Date(date_from) } } : {}),
      ...(psychologistId ? { psychologistId } : {}),
    },
    include: {
      psychologist: { include: { user: { select: { name: true } } } },
      appointment: { include: { patient: { select: { name: true, phone: true } } } },
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  });

  return NextResponse.json(slots);
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();

  const { psychologistId, date, startTime, durationMin = 50, modality = 'PRESENTIAL' } =
    await request.json();

  const [h, m] = startTime.split(':').map(Number);
  const start = new Date(date);
  start.setHours(h, m, 0, 0);
  const endTime = format(addMinutes(start, durationMin), 'HH:mm');

  const slot = await prisma.slot.create({
    data: { psychologistId, date: new Date(date), startTime, endTime, durationMin, modality },
  });

  return NextResponse.json(slot, { status: 201 });
}
