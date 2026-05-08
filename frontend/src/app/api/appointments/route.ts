import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized } from '@/lib/auth';
import { notifyNewAppointment } from '@/lib/notifications';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const psychologistId = searchParams.get('psychologistId');
  const status = searchParams.get('status');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const page = Number(searchParams.get('page') ?? '1');
  const limit = Number(searchParams.get('limit') ?? '20');
  const skip = (page - 1) * limit;

  const where = {
    ...(psychologistId ? { psychologistId } : {}),
    ...(status ? { status: status as never } : {}),
    ...(from || to
      ? { slot: { date: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } }
      : {}),
  };

  const [appointments, total] = await prisma.$transaction([
    prisma.appointment.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        psychologist: { include: { user: { select: { name: true } } } },
        slot: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.appointment.count({ where }),
  ]);

  return NextResponse.json({ appointments, total, page, limit });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();

  const { patientId, psychologistId, slotId, modality, notes, teleconsultUrl } =
    await request.json();

  const slot = await prisma.slot.findUnique({ where: { id: slotId } });
  if (!slot) return NextResponse.json({ error: 'Slot não encontrado' }, { status: 404 });
  if (slot.status !== 'AVAILABLE')
    return NextResponse.json({ error: 'Slot não disponível' }, { status: 409 });

  const [patient, psychologist] = await Promise.all([
    prisma.patient.findUnique({ where: { id: patientId } }),
    prisma.psychologist.findUnique({ where: { id: psychologistId }, include: { user: true } }),
  ]);

  if (!patient || !psychologist)
    return NextResponse.json({ error: 'Paciente ou psicólogo não encontrado' }, { status: 404 });

  const [appointment] = await prisma.$transaction([
    prisma.appointment.create({
      data: { patientId, psychologistId, slotId, modality, notes, teleconsultUrl },
      include: {
        patient: true,
        psychologist: { include: { user: true } },
        slot: true,
      },
    }),
    prisma.slot.update({ where: { id: slotId }, data: { status: 'RESERVED' } }),
  ]);

  const date = format(new Date(slot.date), 'dd/MM/yyyy', { locale: ptBR });
  await notifyNewAppointment({
    patientName: patient.name,
    date,
    time: slot.startTime,
    psychologistName: psychologist.user.name,
    modality,
  });

  return NextResponse.json(appointment, { status: 201 });
}
