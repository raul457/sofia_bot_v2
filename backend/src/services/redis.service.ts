import Redis from 'ioredis';
import { env } from '../config/env';

const HISTORY_TTL = 60 * 60 * 24; // 24h
const MAX_HISTORY = 20;

export type MessageRole = 'user' | 'assistant';

export interface ConversationMessage {
  role: MessageRole;
  content: string;
}

class RedisService {
  private client: Redis;

  constructor() {
    this.client = new Redis(env.REDIS_URL, { lazyConnect: true });
    this.client.on('error', (err) => console.error('[Redis] Erro:', err));
  }

  async connect() {
    await this.client.connect();
    console.log('[Redis] Conectado');
  }

  async getHistory(phone: string): Promise<ConversationMessage[]> {
    const key = `conv:${phone}`;
    const data = await this.client.get(key);
    if (!data) return [];
    try {
      return JSON.parse(data) as ConversationMessage[];
    } catch {
      return [];
    }
  }

  async saveHistory(phone: string, messages: ConversationMessage[]): Promise<void> {
    const key = `conv:${phone}`;
    const trimmed = messages.slice(-MAX_HISTORY);
    await this.client.setex(key, HISTORY_TTL, JSON.stringify(trimmed));
  }

  async clearHistory(phone: string): Promise<void> {
    await this.client.del(`conv:${phone}`);
  }

  async setSession(phone: string, field: string, value: string): Promise<void> {
    const key = `session:${phone}`;
    await this.client.hset(key, field, value);
    await this.client.expire(key, HISTORY_TTL);
  }

  async getSession(phone: string): Promise<Record<string, string>> {
    const key = `session:${phone}`;
    return this.client.hgetall(key);
  }

  async clearSession(phone: string): Promise<void> {
    await this.client.del(`session:${phone}`);
  }

  getClient(): Redis {
    return this.client;
  }
}

export const redisService = new RedisService();
