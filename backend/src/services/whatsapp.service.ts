import axios from 'axios';
import { env } from '../config/env';

const api = axios.create({
  baseURL: env.WHATSAPP_API_URL,
  headers: {
    apikey: env.WHATSAPP_API_TOKEN,
    'Content-Type': 'application/json',
  },
});

export async function sendMessage(phone: string, text: string): Promise<void> {
  try {
    await api.post(`/message/sendText/${env.WHATSAPP_INSTANCE}`, {
      number: phone,
      text,
    });
  } catch (err) {
    console.error('[WhatsApp] Falha ao enviar mensagem para', phone, err);
    throw err;
  }
}

export async function sendTemplateMessage(
  phone: string,
  template: string,
  vars: Record<string, string>
): Promise<void> {
  let text = template;
  for (const [key, val] of Object.entries(vars)) {
    text = text.replaceAll(`{{${key}}}`, val);
  }
  await sendMessage(phone, text);
}

export function extractPhone(webhookData: WebhookPayload): string {
  return webhookData.data?.key?.remoteJid?.replace('@s.whatsapp.net', '') ?? '';
}

export function extractMessage(webhookData: WebhookPayload): string {
  return (
    webhookData.data?.message?.conversation ??
    webhookData.data?.message?.extendedTextMessage?.text ??
    ''
  );
}

export interface WebhookPayload {
  event: string;
  instance: string;
  data: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
    };
    message?: {
      conversation?: string;
      extendedTextMessage?: { text: string };
    };
    messageTimestamp?: number;
    pushName?: string;
  };
}
