import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { addMinutes, format, parseISO } from 'date-fns';

const createSlotSchema = z.object({
  psychologistId: z.string().uuid(),
  date: z.string(),
  startTime: z.string(),
  durationMin: z.number().default(50),
  modality: z.enum(['PRESENTIAL', 'TELECONSULT', 'BOTH']).default('PRESENTIAL'),
});

const bulkGenerateSchema = z.object({
  psychologistId: z.string().uuid(),
  weekDays: z.array(z.number().min(0).max(6)),
  dateFrom: z.string(),
  dateTo: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  durationMin: z.number().default(50),
  breakMin: z.number().default(10),
  modality: z.enum(['PRESENTIAL', 'TELECONSULT', 'BOTH']).default('PRESENTIAL'),
});

export async function listSlots(
  request: FastifyRequest<{ Querystring: { status?: string; date_from?: string; psychologistId?: string } }>,
  reply: FastifyReply
) {
  const { status, date_from, psychologistId } = request.query;

  const slots = await prisma.slot.findMany({
    where: {
      ...(status && { status: status as 'AVAILABLE' | 'RESERVED' | 'BLOCKED' }),
      ...(date_from && { date: { gte: new Date(date_from) } }),
      ...(psychologistId && { psychologistId }),
    },
    include: {
      psychologist: { include: { user: { select: { name: true } } } },
      appointment: { include: { patient: { select: { name: true, phone: true } } } },
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  });

  return reply.send(slots);
}

export async function createSlot(
  request: FastifyRequest<{ Body: z.infer<typeof createSlotSchema> }>,
  reply: FastifyReply
) {
  const data = createSlotSchema.parse(request.body);

  const startParts = data.startTime.split(':').map(Number);
  const startDate = new Date(data.date);
  startDate.setHours(startParts[0], startParts[1], 0);
  const endDate = addMinutes(startDate, data.durationMin);
  const endTime = format(endDate, 'HH:mm');

  const slot = await prisma.slot.create({
    data: {
      psychologistId: data.psychologistId,
      date: new Date(data.date),
      startTime: data.startTime,
      endTime,
      durationMin: data.durationMin,
      modality: data.modality,
    },
  });

  return reply.status(201).send(slot);
}

export async function bulkGenerateSlots(
  request: FastifyRequest<{ Body: z.infer<typeof bulkGenerateSchema> }>,
  reply: FastifyReply
) {
  const data = bulkGenerateSchema.parse(request.body);

  const slots: Array<{
    psychologistId: string;
    date: Date;
    startTime: string;
    endTime: string;
    durationMin: number;
    modality: 'PRESENTIAL' | 'TELECONSULT' | 'BOTH';
  }> = [];

  const from = parseISO(data.dateFrom);
  const to = parseISO(data.dateTo);
  const current = new Date(from);

  while (current <= to) {
    if (data.weekDays.includes(current.getDay())) {
      const [startH, startM] = data.startTime.split(':').map(Number);
      const [endH, endM] = data.endTime.split(':').map(Number);

      let slotStart = new Date(current);
      slotStart.setHours(startH, startM, 0, 0);
      const dayEnd = new Date(current);
      dayEnd.setHours(endH, endM, 0, 0);

      while (addMinutes(slotStart, data.durationMin) <= dayEnd) {
        const slotEnd = addMinutes(slotStart, data.durationMin);
        slots.push({
          psychologistId: data.psychologistId,
          date: new Date(current),
          startTime: format(slotStart, 'HH:mm'),
          endTime: format(slotEnd, 'HH:mm'),
          durationMin: data.durationMin,
          modality: data.modality,
        });
        slotStart = addMinutes(slotEnd, data.breakMin);
      }
    }
    current.setDate(current.getDate() + 1);
  }

  await prisma.slot.createMany({ data: slots, skipDuplicates: true });

  return reply.status(201).send({ created: slots.length });
}

export async function deleteSlot(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { id } = request.params;

  const slot = await prisma.slot.findUnique({ where: { id } });
  if (!slot) return reply.status(404).send({ error: 'Slot não encontrado' });
  if (slot.status === 'RESERVED')
    return reply.status(400).send({ error: 'Não é possível excluir um slot reservado' });

  await prisma.slot.delete({ where: { id } });
  return reply.status(204).send();
}
