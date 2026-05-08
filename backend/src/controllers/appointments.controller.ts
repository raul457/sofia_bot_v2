import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { notifyNewAppointment, notifyCancellation } from '../services/notification.service';
import { scheduleReminders } from '../queues/reminder.queue';
import { emitNewAppointment, emitAppointmentUpdated } from '../websocket/socket';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const createAppointmentSchema = z.object({
  patientId: z.string().uuid(),
  psychologistId: z.string().uuid(),
  slotId: z.string().uuid(),
  modality: z.enum(['PRESENTIAL', 'TELECONSULT']),
  notes: z.string().optional(),
  teleconsultUrl: z.string().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED']),
});

export async function listAppointments(
  request: FastifyRequest<{
    Querystring: {
      psychologistId?: string;
      status?: string;
      from?: string;
      to?: string;
      page?: string;
      limit?: string;
    };
  }>,
  reply: FastifyReply
) {
  const { psychologistId, status, from, to, page = '1', limit = '20' } = request.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [appointments, total] = await prisma.$transaction([
    prisma.appointment.findMany({
      where: {
        ...(psychologistId && { psychologistId }),
        ...(status && { status: status as never }),
        ...(from || to
          ? {
              slot: {
                date: {
                  ...(from && { gte: new Date(from) }),
                  ...(to && { lte: new Date(to) }),
                },
              },
            }
          : {}),
      },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        psychologist: { include: { user: { select: { name: true } } } },
        slot: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
    }),
    prisma.appointment.count({
      where: {
        ...(psychologistId && { psychologistId }),
        ...(status && { status: status as never }),
      },
    }),
  ]);

  return reply.send({ appointments, total, page: Number(page), limit: Number(limit) });
}

export async function getAppointment(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: request.params.id },
    include: {
      patient: true,
      psychologist: { include: { user: true } },
      slot: true,
    },
  });

  if (!appointment) return reply.status(404).send({ error: 'Consulta não encontrada' });
  return reply.send(appointment);
}

export async function createAppointment(
  request: FastifyRequest<{ Body: z.infer<typeof createAppointmentSchema> }>,
  reply: FastifyReply
) {
  const data = createAppointmentSchema.parse(request.body);

  const slot = await prisma.slot.findUnique({ where: { id: data.slotId } });
  if (!slot) return reply.status(404).send({ error: 'Slot não encontrado' });
  if (slot.status !== 'AVAILABLE') return reply.status(409).send({ error: 'Slot não disponível' });

  const [patient, psychologist] = await Promise.all([
    prisma.patient.findUnique({ where: { id: data.patientId } }),
    prisma.psychologist.findUnique({
      where: { id: data.psychologistId },
      include: { user: true },
    }),
  ]);

  if (!patient || !psychologist) return reply.status(404).send({ error: 'Paciente ou psicólogo não encontrado' });

  const [appointment] = await prisma.$transaction([
    prisma.appointment.create({
      data: {
        patientId: data.patientId,
        psychologistId: data.psychologistId,
        slotId: data.slotId,
        modality: data.modality,
        notes: data.notes,
        teleconsultUrl: data.teleconsultUrl,
      },
      include: {
        patient: true,
        psychologist: { include: { user: true } },
        slot: true,
      },
    }),
    prisma.slot.update({ where: { id: data.slotId }, data: { status: 'RESERVED' } }),
  ]);

  const date = format(new Date(slot.date), 'dd/MM/yyyy', { locale: ptBR });
  await notifyNewAppointment({
    patientName: patient.name,
    date,
    time: slot.startTime,
    psychologistName: psychologist.user.name,
    modality: data.modality,
  });

  emitNewAppointment(appointment);

  const appointmentDateTime = new Date(slot.date);
  const [h, m] = slot.startTime.split(':').map(Number);
  appointmentDateTime.setHours(h, m, 0, 0);
  await scheduleReminders(appointment.id, appointmentDateTime);

  return reply.status(201).send(appointment);
}

export async function updateAppointmentStatus(
  request: FastifyRequest<{
    Params: { id: string };
    Body: z.infer<typeof updateStatusSchema>;
  }>,
  reply: FastifyReply
) {
  const { status } = updateStatusSchema.parse(request.body);

  const appointment = await prisma.appointment.findUnique({
    where: { id: request.params.id },
    include: { patient: true, slot: true },
  });

  if (!appointment) return reply.status(404).send({ error: 'Consulta não encontrada' });

  const updated = await prisma.appointment.update({
    where: { id: request.params.id },
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

  emitAppointmentUpdated(updated);
  return reply.send(updated);
}

export async function getDashboardMetrics(
  _request: FastifyRequest,
  reply: FastifyReply
) {
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

  return reply.send({ today, week, month, total, scheduled });
}
