import { FastifyRequest, FastifyReply } from 'fastify';
import { chat } from '../services/claude.service';
import { sendMessage, extractPhone, extractMessage, WebhookPayload } from '../services/whatsapp.service';
import { notifyCrisis } from '../services/notification.service';
import { emitCrisisAlert } from '../websocket/socket';
import { prisma } from '../lib/prisma';

export async function handleWebhook(
  request: FastifyRequest<{ Body: WebhookPayload }>,
  reply: FastifyReply
) {
  const payload = request.body;

  if (payload.event !== 'messages.upsert') {
    return reply.status(200).send({ ok: true });
  }

  if (payload.data?.key?.fromMe) {
    return reply.status(200).send({ ok: true });
  }

  const phone = extractPhone(payload);
  const text = extractMessage(payload);

  if (!phone || !text) {
    return reply.status(200).send({ ok: true });
  }

  reply.status(200).send({ ok: true });

  setImmediate(async () => {
    try {
      await ensureConsentRegistered(phone, payload.data.pushName);

      const { reply: botReply, isCrisis, needsHuman } = await chat(phone, text);

      await sendMessage(phone, botReply);

      await prisma.conversationLog.createMany({
        data: [
          { phone, role: 'user', content: text },
          { phone, role: 'assistant', content: botReply },
        ],
      });

      if (isCrisis) {
        const patient = await prisma.patient.findUnique({ where: { phone } });
        await prisma.patient.updateMany({
          where: { phone },
          data: { isVulnerable: true },
        });
        await notifyCrisis({ patientName: patient?.name, phone });
        emitCrisisAlert({ phone, patientName: patient?.name });
      }

      if (needsHuman) {
        console.log(`[Webhook] Transferência para humano solicitada — ${phone}`);
      }

      if (isConfirmationReply(text)) {
        await handleConfirmation(phone, text);
      }
    } catch (err) {
      console.error('[Webhook] Erro ao processar mensagem:', err);
    }
  });
}

async function ensureConsentRegistered(phone: string, pushName?: string) {
  const exists = await prisma.patient.findUnique({ where: { phone } });
  if (!exists) {
    await prisma.patient.create({
      data: {
        phone,
        name: pushName ?? 'Não identificado',
        birthDate: new Date('2000-01-01'),
        consentGiven: true,
        consentDate: new Date(),
      },
    });
  }
}

function isConfirmationReply(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return lower === 'sim' || lower === 'não' || lower === 'nao';
}

async function handleConfirmation(phone: string, text: string) {
  const lower = text.toLowerCase().trim();
  const patient = await prisma.patient.findUnique({ where: { phone } });
  if (!patient) return;

  const appointment = await prisma.appointment.findFirst({
    where: {
      patientId: patient.id,
      status: { in: ['SCHEDULED', 'CONFIRMED'] },
    },
    include: { slot: true },
    orderBy: { createdAt: 'desc' },
  });

  if (!appointment) return;

  if (lower === 'sim') {
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: 'CONFIRMED', confirmedAt: new Date() },
    });
    await sendMessage(phone, 'Ótimo! Sua presença foi confirmada. Te esperamos! 💙');
  } else {
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: 'CANCELLED' },
    });
    await prisma.slot.update({
      where: { id: appointment.slotId },
      data: { status: 'AVAILABLE' },
    });
    await sendMessage(
      phone,
      'Entendido, sua consulta foi cancelada. Se precisar remarcar, estamos aqui! 💙'
    );
  }
}
