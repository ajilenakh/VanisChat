import { createId } from '@paralleldrive/cuid2';
import { eq } from 'drizzle-orm';
import { type getDb, schema } from '../db';

export function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface TokenRecord {
  id: string;
  token: string;
  type: 'invite' | 'session';
  expiresAt: number;
}

export function createInviteToken(_roomId: string, expiresInMinutes: number): TokenRecord {
  const now = Math.floor(Date.now() / 1000);
  return {
    id: createId(),
    token: generateToken(),
    type: 'invite',
    expiresAt: now + expiresInMinutes * 60,
  };
}

export function createSessionToken(_roomId: string, expiresInMinutes: number): TokenRecord {
  const now = Math.floor(Date.now() / 1000);
  return {
    id: createId(),
    token: generateToken(),
    type: 'session',
    expiresAt: now + expiresInMinutes * 60,
  };
}

export async function validateToken(
  db: ReturnType<typeof getDb>,
  token: string,
  type: 'invite' | 'session',
) {
  const rows = await db
    .select()
    .from(schema.roomTokens)
    .where(eq(schema.roomTokens.id, token))
    .limit(1);

  const record = rows[0];
  if (!record) return null;
  if (record.type !== type) return null;
  if (record.expiresAt < Math.floor(Date.now() / 1000)) return null;
  if (type === 'invite' && record.usesLeft != null && record.usesLeft <= 0) return null;

  return record;
}
