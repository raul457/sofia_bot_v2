import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized } from '@/lib/auth';
import { notifyCancellation } from '@/lib/notifications';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();

  const { status } = await request.json();

  const appointment = await prisma.appointment.findUnique({
    where: { id: params.id },
    include: { patient: true, slot: true },
  });

  if (!appointment)
    return NextResponse.json({ error: 'Consulta não encontrada' }, { status: 404 });

  const updated = await prisma.appointment.update({
    where: { id: params.id },
    data: {
      status,
      ...(status === 'CONFIRMED' ? { confirmedAt: new Date() } : {}),
    },
  });

  if (status === 'CANCELLED') {
    await prisma.slot.update({
      where: { id: appointment.slotId },
      data: { status: 'AVAILABLE' },
    });
    const date = format(new Date(appointment.slot.date), 'dd/MM/yyyy', { locale: ptBR });
    await notifyCancellation({
      patientName: appointment.patient.name,
      date,
      time: appointment.slot.startTime,
    });
  }

  return NextResponse.json(updated);
}
