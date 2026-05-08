import { NextRequest, NextResponse } from 'next/server';
import { chat } from '@/lib/claude';
import { sendMessage, extractPhone, extractMessage, WebhookPayload } from '@/lib/whatsapp';
import { notifyCrisis } from '@/lib/notifications';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as WebhookPayload;

  if (payload.event !== 'messages.upsert') {
    return NextResponse.json({ ok: true });
  }

  if (payload.data?.key?.fromMe) {
    return NextResponse.json({ ok: true });
  }

  const phone = extractPhone(payload.data);
  const text = extractMessage(payload.data);

  if (!phone || !text) return NextResponse.json({ ok: true });

  // Responde imediatamente ao WhatsApp (não bloqueia)
  const response = NextResponse.json({ ok: true });

  // Processa de forma assíncrona (edge case: pode timeout em free tier)
  processMessage(phone, text, payload.data.pushName).catch(console.error);

  return response;
}

async function processMessage(phone: string, text: string, pushName?: string) {
  await ensurePatientExists(phone, pushName);

  const { reply, isCrisis } = await chat(phone, text);

  await sendMessage(phone, reply);

  if (isCrisis) {
    await prisma.patient.updateMany({ where: { phone }, data: { isVulnerable: true } });
    const patient = await prisma.patient.findUnique({ where: { phone } });
    await notifyCrisis(patient?.name, phone);
  }

  const lower = text.toLowerCase().trim();
  if (lower === 'sim' || lower === 'não' || lower === 'nao') {
    await handleConfirmation(phone, lower);
  }
}

async function ensurePatientExists(phone: string, pushName?: string) {
  await prisma.patient.upsert({
    where: { phone },
    update: {},
    create: {
      phone,
      name: pushName ?? 'Não identificado',
      birthDate: new Date('2000-01-01'),
      consentGiven: true,
      consentDate: new Date(),
    },
  });
}

async function handleConfirmation(phone: string, answer: string) {
  const patient = await prisma.patient.findUnique({ where: { phone } });
  if (!patient) return;

  const appointment = await prisma.appointment.findFirst({
    where: { patientId: patient.id, status: { in: ['SCHEDULED', 'CONFIRMED'] } },
    include: { slot: true },
    orderBy: { createdAt: 'desc' },
  });

  if (!appointment) return;

  if (answer === 'sim') {
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: 'CONFIRMED', confirmedAt: new Date() },
    });
    await sendMessage(phone, 'Ótimo! Presença confirmada. Te esperamos! 💙');
  } else {
    await prisma.appointment.update({ where: { id: appointment.id }, data: { status: 'CANCELLED' } });
    await prisma.slot.update({ where: { id: appointment.slotId }, data: { status: 'AVAILABLE' } });
    await sendMessage(phone, 'Consulta cancelada. Se precisar remarcar, estamos aqui! 💙');
  }
}
