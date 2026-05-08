import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendReminder24h, sendConfirmationRequest } from '@/lib/notifications';
import { format, addHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Protegida pelo CRON_SECRET — chamada pelo Vercel Cron
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const now = new Date();
  const in24h = addHours(now, 24);
  const in2h = addHours(now, 2);

  // Lembretes 24h: consultas entre 23h e 25h a partir de agora
  const appointments24h = await prisma.appointment.findMany({
    where: {
      reminderSent24h: false,
      status: { in: ['SCHEDULED', 'CONFIRMED'] },
      slot: {
        date: {
          gte: new Date(in24h.getTime() - 60 * 60 * 1000),
          lte: new Date(in24h.getTime() + 60 * 60 * 1000),
        },
      },
    },
    include: {
      patient: true,
      psychologist: { include: { user: true } },
      slot: true,
    },
  });

  for (const appt of appointments24h) {
    const date = format(new Date(appt.slot.date), 'dd/MM/yyyy', { locale: ptBR });
    await sendReminder24h({
      phone: appt.patient.phone,
      patientName: appt.patient.name,
      date,
      time: appt.slot.startTime,
      psychologistName: appt.psychologist.user.name,
      modality: appt.modality,
      address: process.env.CLINIC_ADDRESS,
      teleconsultUrl: appt.teleconsultUrl ?? process.env.TELECONSULT_URL,
    });
    await prisma.appointment.update({
      where: { id: appt.id },
      data: { reminderSent24h: true },
    });
  }

  // Lembretes 2h: consultas entre 1h e 3h a partir de agora
  const appointments2h = await prisma.appointment.findMany({
    where: {
      reminderSent2h: false,
      status: { in: ['SCHEDULED', 'CONFIRMED'] },
      slot: {
        date: {
          gte: new Date(in2h.getTime() - 60 * 60 * 1000),
          lte: new Date(in2h.getTime() + 60 * 60 * 1000),
        },
      },
    },
    include: { patient: true, slot: true },
  });

  for (const appt of appointments2h) {
    await sendConfirmationRequest({
      phone: appt.patient.phone,
      patientName: appt.patient.name,
      time: appt.slot.startTime,
    });
    await prisma.appointment.update({
      where: { id: appt.id },
      data: { reminderSent2h: true },
    });
  }

  return NextResponse.json({
    ok: true,
    reminders24h: appointments24h.length,
    reminders2h: appointments2h.length,
  });
}
