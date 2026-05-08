import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { env } from './config/env';
import { registerRoutes } from './routes';
import { setupWebSocket } from './websocket/socket';
import { redisService } from './services/redis.service';
import { startReminderWorker } from './queues/reminder.queue';
import { prisma } from './lib/prisma';

const app = Fastify({
  logger: env.NODE_ENV === 'development',
});

async function bootstrap() {
  await app.register(cors, {
    origin: env.FRONTEND_URL,
    credentials: true,
  });

  await app.register(jwt, {
    secret: env.JWT_SECRET,
  });

  await registerRoutes(app);
  setupWebSocket(app);

  await redisService.connect();
  startReminderWorker();

  await prisma.$connect();
  console.log('[Prisma] Conectado ao banco de dados');

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  console.log(`[Server] Rodando em http://localhost:${env.PORT}`);
}

bootstrap().catch((err) => {
  console.error('[Server] Falha ao iniciar:', err);
  process.exit(1);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  await app.close();
  process.exit(0);
});
