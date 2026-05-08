import { FastifyInstance } from 'fastify';
import { Server as SocketServer } from 'socket.io';
import { env } from '../config/env';

let io: SocketServer | null = null;

export function setupWebSocket(app: FastifyInstance) {
  io = new SocketServer(app.server, {
    cors: {
      origin: env.FRONTEND_URL,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('[Socket.io] Cliente conectado:', socket.id);

    socket.on('join:admin', () => {
      socket.join('admin');
      console.log('[Socket.io] Admin entrou na sala');
    });

    socket.on('disconnect', () => {
      console.log('[Socket.io] Cliente desconectado:', socket.id);
    });
  });

  console.log('[Socket.io] WebSocket configurado');
}

export function emitToAdmin(event: string, data: unknown) {
  if (!io) return;
  io.to('admin').emit(event, data);
}

export function emitNewAppointment(appointment: unknown) {
  emitToAdmin('appointment:new', appointment);
}

export function emitAppointmentUpdated(appointment: unknown) {
  emitToAdmin('appointment:updated', appointment);
}

export function emitCrisisAlert(data: unknown) {
  emitToAdmin('crisis:alert', data);
}
