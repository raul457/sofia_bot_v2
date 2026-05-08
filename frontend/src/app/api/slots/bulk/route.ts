import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized } from '@/lib/auth';
import { addMinutes, format, parseISO } from 'date-fns';

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();

  const {
    psychologistId,
    weekDays,
    dateFrom,
    dateTo,
    startTime,
    endTime,
    durationMin = 50,
    breakMin = 10,
    modality = 'PRESENTIAL',
  } = await request.json();

  const slots: Array<{
    psychologistId: string;
    date: Date;
    startTime: string;
    endTime: string;
    durationMin: number;
    modality: string;
  }> = [];

  const from = parseISO(dateFrom);
  const to = parseISO(dateTo);
  const current = new Date(from);

  while (current <= to) {
    if ((weekDays as number[]).includes(current.getDay())) {
      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);

      let slotStart = new Date(current);
      slotStart.setHours(startH, startM, 0, 0);
      const dayEnd = new Date(current);
      dayEnd.setHours(endH, endM, 0, 0);

      while (addMinutes(slotStart, durationMin) <= dayEnd) {
        const slotEnd = addMinutes(slotStart, durationMin);
        slots.push({
          psychologistId,
          date: new Date(current),
          startTime: format(slotStart, 'HH:mm'),
          endTime: format(slotEnd, 'HH:mm'),
          durationMin,
          modality,
        });
        slotStart = addMinutes(slotEnd, breakMin);
      }
    }
    current.setDate(current.getDate() + 1);
  }

  await prisma.slot.createMany({ data: slots as never, skipDuplicates: true });

  return NextResponse.json({ created: slots.length }, { status: 201 });
}
