import { sendMessage } from './whatsapp.service';
import { env } from '../config/env';

export async function notifyAdmin(message: string): Promise<void> {
  await sendMessage(env.ADMIN_NOTIFICATION_PHONE, message);
}

export async function notifyNewAppointment(data: {
  patientName: string;
  date: string;
  time: string;
  psychologistName: string;
  modality: string;
}): Promise<void> {
  const msg = `🆕 NOVO AGENDAMENTO
👤 Paciente: ${data.patientName}
📅 Data: ${data.date}
⏰ Horário: ${data.time}
👩‍⚕️ Psicólogo(a): ${data.psychologistName}
📋 Modalidade: ${data.modality}`;

  await notifyAdmin(msg);
}

export async function notifyCrisis(data: {
  patientName?: string;
  phone: string;
}): Promise<void> {
  const msg = `🚨 ALERTA DE CRISE — ATENÇÃO URGENTE
👤 Paciente: ${data.patientName ?? 'Não identificado'}
📱 Telefone: ${data.phone}
⚠️ O paciente demonstrou sinais de sofrimento emocional intenso.
Por favor, entre em contato IMEDIATAMENTE.`;

  await notifyAdmin(msg);
}

export async function notifyCancellation(data: {
  patientName: string;
  date: string;
  time: string;
}): Promise<void> {
  const msg = `❌ CANCELAMENTO DE CONSULTA
👤 Paciente: ${data.patientName}
📅 Data: ${data.date}
⏰ Horário: ${data.time}`;

  await notifyAdmin(msg);
}

export async function notifyNoConfirmation(data: {
  patientName: string;
  phone: string;
  date: string;
  time: string;
}): Promise<void> {
  const msg = `⚠️ CONSULTA SEM CONFIRMAÇÃO
👤 Paciente: ${data.patientName}
📱 Telefone: ${data.phone}
📅 Data: ${data.date}
⏰ Horário: ${data.time}
O paciente não confirmou presença. Slot liberado.`;

  await notifyAdmin(msg);
}

export async function sendReminder24h(data: {
  phone: string;
  patientName: string;
  date: string;
  time: string;
  psychologistName: string;
  modality: string;
  address?: string;
  teleconsultUrl?: string;
}): Promise<void> {
  const locationInfo =
    data.modality === 'TELECONSULT'
      ? `🔗 Link: ${data.teleconsultUrl}\n📌 Acesse 5 minutos antes`
      : `📍 Endereço: ${data.address}\n📌 Chegue 10 minutos antes`;

  const msg = `⏰ LEMBRETE DE CONSULTA
Olá, ${data.patientName}! Sua consulta é amanhã.

📅 Data: ${data.date}
⏰ Horário: ${data.time}
👩‍⚕️ Psicólogo(a): ${data.psychologistName}
${locationInfo}

Até amanhã! 💙`;

  await sendMessage(data.phone, msg);
}

export async function sendConfirmationRequest(data: {
  phone: string;
  patientName: string;
  date: string;
  time: string;
}): Promise<void> {
  const msg = `Olá, ${data.patientName}! Sua consulta é hoje às ${data.time}.

Por favor, confirme sua presença respondendo:
✅ SIM — vou comparecer
❌ NÃO — preciso cancelar`;

  await sendMessage(data.phone, msg);
}
