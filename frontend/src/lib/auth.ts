import { SignJWT, jwtVerify } from 'jose';
import { NextRequest } from 'next/server';

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'fallback_secret_change_in_production'
);

export interface JWTPayload {
  sub: string;
  role: string;
  name: string;
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, secret);
  return payload as unknown as JWTPayload;
}

export async function getAuthUser(request: NextRequest): Promise<JWTPayload | null> {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;

  try {
    return await verifyToken(auth.slice(7));
  } catch {
    return null;
  }
}

export function unauthorized() {
  return Response.json({ error: 'Não autorizado' }, { status: 401 });
}

export function forbidden() {
  return Response.json({ error: 'Acesso negado' }, { status: 403 });
}
