import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001').transform(Number),
  GEMINI_API_KEY: z.string().min(1),
  WHATSAPP_API_URL: z.string().url(),
  WHATSAPP_API_TOKEN: z.string().min(1),
  WHATSAPP_INSTANCE: z.string().default('sofia'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(32),
  ADMIN_NOTIFICATION_PHONE: z.string().min(1),
  CLINIC_NAME: z.string().default('Clínica Sofia'),
  CLINIC_ADDRESS: z.string().default(''),
  CLINIC_PHONE: z.string().default(''),
  TELECONSULT_URL: z.string().default(''),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Variáveis de ambiente inválidas:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
