const BASE_URL = process.env.WHATSAPP_API_URL ?? '';
const TOKEN = process.env.WHATSAPP_API_TOKEN ?? '';
const INSTANCE = process.env.WHATSAPP_INSTANCE ?? 'sofia';

export async function sendMessage(phone: string, text: string): Promise<void> {
  if (!BASE_URL || !TOKEN) {
    console.warn('[WhatsApp] Variáveis não configuradas. Mensagem não enviada:', phone, text);
    return;
  }

  const res = await fetch(`${BASE_URL}/message/sendText/${INSTANCE}`, {
    method: 'POST',
    headers: {
      apikey: TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ number: phone, text }),
  });

  if (!res.ok) {
    console.error('[WhatsApp] Falha ao enviar para', phone, await res.text());
  }
}

export function extractPhone(data: WebhookData): string {
  return data?.key?.remoteJid?.replace('@s.whatsapp.net', '') ?? '';
}

export function extractMessage(data: WebhookData): string {
  return (
    data?.message?.conversation ??
    data?.message?.extendedTextMessage?.text ??
    ''
  );
}

export interface WebhookPayload {
  event: string;
  instance: string;
  data: WebhookData;
}

export interface WebhookData {
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
}
