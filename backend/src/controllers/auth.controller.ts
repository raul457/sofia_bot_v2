import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'RECEPTIONIST', 'PSYCHOLOGIST']).default('RECEPTIONIST'),
  specialty: z.string().optional(),
});

export async function login(
  request: FastifyRequest<{ Body: z.infer<typeof loginSchema> }>,
  reply: FastifyReply
) {
  const { email, password } = loginSchema.parse(request.body);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return reply.status(401).send({ error: 'Credenciais inválidas' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return reply.status(401).send({ error: 'Credenciais inválidas' });

  const token = await reply.jwtSign(
    { sub: user.id, role: user.role, name: user.name },
    { expiresIn: '7d' }
  );

  return reply.send({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}

export async function register(
  request: FastifyRequest<{ Body: z.infer<typeof registerSchema> }>,
  reply: FastifyReply
) {
  const data = registerSchema.parse(request.body);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) return reply.status(409).send({ error: 'E-mail já cadastrado' });

  const hashed = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashed,
      role: data.role,
      ...(data.role === 'PSYCHOLOGIST' && data.specialty
        ? {
            psychologist: {
              create: { specialty: data.specialty },
            },
          }
        : {}),
    },
    include: { psychologist: true },
  });

  return reply.status(201).send({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
}

export async function getMe(request: FastifyRequest, reply: FastifyReply) {
  const payload = request.user as { sub: string };
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: { psychologist: true },
  });

  if (!user) return reply.status(404).send({ error: 'Usuário não encontrado' });

  const { password: _, ...safeUser } = user;
  return reply.send(safeUser);
}

export async function listPsychologists(_request: FastifyRequest, reply: FastifyReply) {
  const psychologists = await prisma.psychologist.findMany({
    include: { user: { select: { name: true, email: true } } },
  });
  return reply.send(psychologists);
}
