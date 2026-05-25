import { eq } from 'drizzle-orm';
import type { Context, Next } from 'hono';
import { getDb, schema } from '../db';

export async function requireSession(c: Context, next: Next) {
  const sessionToken = c.req.header('x-session-token');
  if (!sessionToken) {
    return c.json({ error: 'invalid_token', message: 'Missing x-session-token header' }, 401);
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(schema.roomTokens)
    .where(eq(schema.roomTokens.id, sessionToken))
    .limit(1);

  const token = rows[0];
  if (!token || token.type !== 'session') {
    return c.json({ error: 'invalid_token', message: 'Invalid session token' }, 401);
  }

  const now = Math.floor(Date.now() / 1000);
  if (token.expiresAt < now) {
    return c.json({ error: 'invalid_token', message: 'Session expired' }, 401);
  }

  // Check room hasn't expired
  const roomRows = await db
    .select({ expiresAt: schema.rooms.expiresAt })
    .from(schema.rooms)
    .where(eq(schema.rooms.id, token.roomId))
    .limit(1);

  const room = roomRows[0];
  if (!room || room.expiresAt < now) {
    return c.json({ error: 'room_expired', message: 'Room has expired' }, 403);
  }

  // Attach session info to context
  c.set('sessionToken', sessionToken);
  c.set('roomId', token.roomId);

  await next();
}
