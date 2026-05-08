import { FastifyInstance } from 'fastify';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware';
import { handleWebhook } from '../controllers/webhook.controller';
import {
  listSlots,
  createSlot,
  bulkGenerateSlots,
  deleteSlot,
} from '../controllers/slots.controller';
import {
  listAppointments,
  getAppointment,
  createAppointment,
  updateAppointmentStatus,
  getDashboardMetrics,
} from '../controllers/appointments.controller';
import {
  listPatients,
  getPatient,
  createPatient,
  updatePatient,
  getPatientHistory,
} from '../controllers/patients.controller';
import {
  login,
  register,
  getMe,
  listPsychologists,
} from '../controllers/auth.controller';

export async function registerRoutes(app: FastifyInstance) {
  // Health check
  app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));

  // Webhook WhatsApp (público)
  app.post('/webhook', handleWebhook);

  // Auth
  app.post('/auth/login', login);
  app.post('/auth/register', { preHandler: [authenticate, requireAdmin] }, register);
  app.get('/auth/me', { preHandler: [authenticate] }, getMe);

  // Psicólogos (público para o bot)
  app.get('/psychologists', listPsychologists);

  // Slots
  app.get('/slots', { preHandler: [authenticate] }, listSlots);
  app.post('/slots', { preHandler: [authenticate] }, createSlot);
  app.post('/slots/bulk', { preHandler: [authenticate] }, bulkGenerateSlots);
  app.delete('/slots/:id', { preHandler: [authenticate] }, deleteSlot);

  // Consultas
  app.get('/appointments', { preHandler: [authenticate] }, listAppointments);
  app.get('/appointments/metrics', { preHandler: [authenticate] }, getDashboardMetrics);
  app.get('/appointments/:id', { preHandler: [authenticate] }, getAppointment);
  app.post('/appointments', { preHandler: [authenticate] }, createAppointment);
  app.patch('/appointments/:id/status', { preHandler: [authenticate] }, updateAppointmentStatus);

  // Pacientes
  app.get('/patients', { preHandler: [authenticate] }, listPatients);
  app.get('/patients/:id', { preHandler: [authenticate] }, getPatient);
  app.post('/patients', { preHandler: [authenticate] }, createPatient);
  app.patch('/patients/:id', { preHandler: [authenticate] }, updatePatient);
  app.get('/patients/:id/history', { preHandler: [authenticate] }, getPatientHistory);

  // API pública de slots (usada pelo bot)
  app.get('/api/slots', async (request, reply) => {
    const query = request.query as { status?: string; date_from?: string; psychologistId?: string };
    return listSlots(
      { ...request, query } as never,
      reply
    );
  });
}
