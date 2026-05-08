import { Queue, Worker, Job } from 'bullmq';
import { redisService } from '../services/redis.service';
import {
  sendReminder24h,
  sendConfirmationRequest,
  notifyNoConfirmation,
} from '../services/notification.service';
import { prisma } from '../lib/prisma';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const reminderQueue = new Queue('reminders', {
  connection: redisService.getClient(),
});

export function startReminderWorker() {
  const worker = new Worker(
    'reminders',
    async (job: Job) => {
      const { type, appointmentId } = job.data as {
        type: '24h' | '2h' | 'noshow_check';
        appointmentId: string;
      };

      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          patient: true,
          psychologist: { include: { user: true } },
          slot: true,
        },
      });

      if (!appointment) return;
      if (appointment.status === 'CANCELLED') return;

      const date = format(new Date(appointment.slot.date), 'dd/MM/yyyy', { locale: ptBR });
      const time = appointment.slot.startTime;

      if (type === '24h') {
        await sendReminder24h({
          phone: appointment.patient.phone,
          patientName: appointment.patient.name,
          date,
          time,
          psychologistName: appointment.psychologist.user.name,
          modality: appointment.modality,
          address: process.env.CLINIC_ADDRESS,
          teleconsultUrl: appointment.teleconsultUrl ?? process.env.TELECONSULT_URL,
        });
        await prisma.appointment.update({
          where: { id: appointmentId },
          data: { reminderSent24h: true },
        });
      }

      if (type === '2h') {
        await sendConfirmationRequest({
          phone: appointment.patient.phone,
          patientName: appointment.patient.name,
          date,
          time,
        });
        await prisma.appointment.update({
          where: { id: appointmentId },
          data: { reminderSent2h: true },
        });
      }

      if (type === 'noshow_check') {
        if (appointment.confirmedAt) return;

        await notifyNoConfirmation({
          patientName: appointment.patient.name,
          phone: appointment.patient.phone,
          date,
          time,
        });

        await prisma.slot.update({
          where: { id: appointment.slotId },
          data: { status: 'AVAILABLE' },
        });
        await prisma.appointment.update({
          where: { id: appointmentId },
          data: { status: 'CANCELLED' },
        });
      }
    },
    { connection: redisService.getClient() }
  );

  worker.on('failed', (job, err) => {
    console.error(`[ReminderQueue] Job ${job?.id} falhou:`, err.message);
  });

  console.log('[ReminderQueue] Worker iniciado');
}

export async function scheduleReminders(appointmentId: string, appointmentDate: Date) {
  const now = Date.now();
  const apptMs = appointmentDate.getTime();

  const delay24h = apptMs - 24 * 60 * 60 * 1000 - now;
  const delay2h = apptMs - 2 * 60 * 60 * 1000 - now;
  const delayNoShow = apptMs - 60 * 60 * 1000 - now; // 1h antes: se sem resposta

  if (delay24h > 0) {
    await reminderQueue.add('reminder-24h', { type: '24h', appointmentId }, { delay: delay24h });
  }
  if (delay2h > 0) {
    await reminderQueue.add('reminder-2h', { type: '2h', appointmentId }, { delay: delay2h });
  }
  if (delayNoShow > 0) {
    await reminderQueue.add(
      'noshow-check',
      { type: 'noshow_check', appointmentId },
      { delay: delayNoShow }
    );
  }
}
