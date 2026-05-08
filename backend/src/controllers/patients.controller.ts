import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

const createPatientSchema = z.object({
  name: z.string().min(2),
  birthDate: z.string(),
  phone: z.string().min(10),
  email: z.string().email().optional(),
  insuranceType: z.enum(['INSURANCE', 'PRIVATE']).optional(),
  insuranceName: z.string().optional(),
});

const updatePatientSchema = createPatientSchema.partial().extend({
  isVulnerable: z.boolean().optional(),
});

export async function listPatients(
  request: FastifyRequest<{
    Querystring: { search?: string; isVulnerable?: string; page?: string; limit?: string };
  }>,
  reply: FastifyReply
) {
  const { search, isVulnerable, page = '1', limit = '20' } = request.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [patients, total] = await prisma.$transaction([
    prisma.patient.findMany({
      where: {
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }),
        ...(isVulnerable !== undefined && { isVulnerable: isVulnerable === 'true' }),
      },
      include: {
        _count: { select: { appointments: true } },
      },
      orderBy: { name: 'asc' },
      skip,
      take: Number(limit),
    }),
    prisma.patient.count({
      where: {
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
          ],
        }),
      },
    }),
  ]);

  return reply.send({ patients, total, page: Number(page), limit: Number(limit) });
}

export async function getPatient(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const patient = await prisma.patient.findUnique({
    where: { id: request.params.id },
    include: {
      appointments: {
        include: {
          psychologist: { include: { user: { select: { name: true } } } },
          slot: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!patient) return reply.status(404).send({ error: 'Paciente não encontrado' });
  return reply.send(patient);
}

export async function createPatient(
  request: FastifyRequest<{ Body: z.infer<typeof createPatientSchema> }>,
  reply: FastifyReply
) {
  const data = createPatientSchema.parse(request.body);

  const existing = await prisma.patient.findUnique({ where: { phone: data.phone } });
  if (existing) return reply.status(409).send({ error: 'Paciente com este telefone já existe' });

  const patient = await prisma.patient.create({
    data: {
      ...data,
      birthDate: new Date(data.birthDate),
      consentGiven: true,
      consentDate: new Date(),
    },
  });

  return reply.status(201).send(patient);
}

export async function updatePatient(
  request: FastifyRequest<{
    Params: { id: string };
    Body: z.infer<typeof updatePatientSchema>;
  }>,
  reply: FastifyReply
) {
  const data = updatePatientSchema.parse(request.body);

  const patient = await prisma.patient.update({
    where: { id: request.params.id },
    data: {
      ...data,
      ...(data.birthDate && { birthDate: new Date(data.birthDate) }),
    },
  });

  return reply.send(patient);
}

export async function getPatientHistory(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const patient = await prisma.patient.findUnique({ where: { id: request.params.id } });
  if (!patient) return reply.status(404).send({ error: 'Paciente não encontrado' });

  const logs = await prisma.conversationLog.findMany({
    where: { phone: patient.phone },
    orderBy: { createdAt: 'asc' },
  });

  return reply.send(logs);
}
