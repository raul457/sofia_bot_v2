import { FastifyRequest, FastifyReply } from 'fastify';

export interface JWTPayload {
  sub: string;
  role: string;
  name: string;
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    reply.status(401).send({ error: 'Não autorizado' });
  }
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as JWTPayload;
  if (user.role !== 'ADMIN') {
    reply.status(403).send({ error: 'Acesso negado. Apenas administradores.' });
  }
}
