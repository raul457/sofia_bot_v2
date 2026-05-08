import { sendMessage } from './whatsapp';

const ADMIN_PHONE = process.env.ADMIN_NOTIFICATION_PHONE ?? '';

async function notifyAdmin(message: string) {
  if (ADMIN_PHONE) await sendMessage(ADMIN_PHONE, message);
}

export async function notifyNewAppointment(data: {
  patientName: string;
  date: string;
  time: string;
  psychologistName: string;
  modality: string;
}) {
  await notifyAdmin(
    `🆕 NOVO AGENDAMENTO\n👤 Paciente: ${data.patientName}\n📅 Data: ${data.date}\n⏰ Horário: ${data.time}\n👩‍⚕️ Psicólogo(a): ${data.psychologistName}\n📋 Modalidade: ${data.modality}`
  );
}

export async function notifyCrisis(patientName: string | undefined, phone: string) {
  await notifyAdmin(
    `🚨 ALERTA DE CRISE — URGENTE\n👤 Paciente: ${patientName ?? 'Não identificado'}\n📱 Telefone: ${phone}\n⚠️ Sinais de sofrimento intenso detectados. Entre em contato IMEDIATAMENTE.`
  );
}

export async function notifyCancellation(data: {
  patientName: string;
  date: string;
  time: string;
}) {
  await notifyAdmin(
    `❌ CANCELAMENTO\n👤 ${data.patientName}\n📅 ${data.date} às ${data.time}`
  );
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
}) {
  const locationInfo =
    data.modality === 'TELECONSULT'
      ? `🔗 Link: ${data.teleconsultUrl}\n📌 Acesse 5 minutos antes`
      : `📍 ${data.address}\n📌 Chegue 10 minutos antes`;

  await sendMessage(
    data.phone,
    `⏰ LEMBRETE DE CONSULTA\nOlá, ${data.patientName}! Sua consulta é amanhã.\n\n📅 ${data.date} às ${data.time}\n👩‍⚕️ ${data.psychologistName}\n${locationInfo}\n\nAté amanhã! 💙`
  );
}

export async function sendConfirmationRequest(data: {
  phone: string;
  patientName: string;
  time: string;
}) {
  await sendMessage(
    data.phone,
    `Olá, ${data.patientName}! Sua consulta é hoje às ${data.time}.\n\nConfirme sua presença respondendo:\n✅ SIM — vou comparecer\n❌ NÃO — preciso cancelar`
  );
}
