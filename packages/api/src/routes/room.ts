import { createId } from '@paralleldrive/cuid2';
import { generateSalt } from '@vanischat/crypto';
import { eq, lt } from 'drizzle-orm';
import { Hono } from 'hono';
import { getDb, schema } from '../db';
import { createInviteToken, createSessionToken } from '../lib/token';
import { createRoomSchema, joinRoomSchema } from '../lib/validate';
import { requireSession } from '../middleware/auth';
import { rateLimit } from '../middleware/rate-limit';

const roomRoutes = new Hono();

// POST /api/rooms — create a new room
roomRoutes.post('/rooms', rateLimit({ max: 20, windowMs: 60_000 }), async (c) => {
  const parsed = createRoomSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: 'validation_error', details: parsed.error }, 400);
  }

  const { name, password, expirationMinutes } = parsed.data;
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const roomId = createId();
  const saltBytes = generateSalt();
  const saltHex = Array.from(saltBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const passwordHash = await Bun.password.hash(password);

  const inviteToken = createInviteToken(expirationMinutes);

  await db.insert(schema.rooms).values({
    id: roomId,
    name,
    password: passwordHash,
    salt: saltHex,
    expiresAt: now + expirationMinutes * 60,
  });

  await db.insert(schema.roomTokens).values({
    id: inviteToken.token,
    roomId,
    type: 'invite',
    expiresAt: inviteToken.expiresAt,
    usesLeft: 1,
  });

  return c.json({
    roomId,
    inviteToken: inviteToken.token,
    expiresAt: now + expirationMinutes * 60,
  });
});

// POST /api/rooms/:id/join — join a room with invite token
roomRoutes.post('/rooms/:id/join', rateLimit({ max: 20, windowMs: 60_000 }), async (c) => {
  const parsed = joinRoomSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: 'validation_error', details: parsed.error }, 400);
  }

  const { inviteToken, nickname, password } = parsed.data;
  const roomId = c.req.param('id');
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  // Find the invite token record
  const tokenRows = await db
    .select()
    .from(schema.roomTokens)
    .where(eq(schema.roomTokens.id, inviteToken))
    .limit(1);

  const token = tokenRows[0];
  if (!token || token.type !== 'invite') {
    return c.json({ error: 'invalid_token', message: 'Invalid invite token' }, 401);
  }

  if (token.expiresAt < now) {
    return c.json({ error: 'invalid_token', message: 'Invite token expired' }, 401);
  }

  if (token.usesLeft != null && token.usesLeft <= 0) {
    return c.json({ error: 'invalid_token', message: 'Invite token already used' }, 401);
  }

  // Check room exists and hasn't expired
  const roomRows = await db.select().from(schema.rooms).where(eq(schema.rooms.id, roomId)).limit(1);

  const room = roomRows[0];
  if (!room) {
    return c.json({ error: 'room_not_found' }, 404);
  }

  if (room.expiresAt < now) {
    return c.json({ error: 'room_expired' }, 403);
  }

  // Verify password
  const passwordValid = await Bun.password.verify(password, room.password);
  if (!passwordValid) {
    return c.json({ error: 'invalid_token', message: 'Invalid room password' }, 401);
  }

  // Mark invite token as used
  await db
    .update(schema.roomTokens)
    .set({ usesLeft: 0 })
    .where(eq(schema.roomTokens.id, inviteToken));

  // Create a session token for this user
  const sessionToken = createSessionToken(1440); // 24-hour session
  await db.insert(schema.roomTokens).values({
    id: sessionToken.token,
    roomId,
    type: 'session',
    expiresAt: sessionToken.expiresAt,
    usesLeft: null, // unlimited for session tokens
    nickname,
  });

  // Fetch recent messages
  const messages = await db
    .select()
    .from(schema.messages)
    .where(eq(schema.messages.roomId, roomId))
    .orderBy(schema.messages.createdAt)
    .limit(50);

  return c.json({
    sessionToken: sessionToken.token,
    messages: messages.map((m) => ({
      id: m.id,
      senderName: m.senderName,
      content: m.content,
      iv: m.iv,
      type: m.type,
      createdAt: m.createdAt,
    })),
    room: {
      name: room.name,
      expiresAt: room.expiresAt,
      salt: room.salt,
    },
  });
});

// POST /api/rooms/:id/leave
roomRoutes.post('/rooms/:id/leave', requireSession, async (c) => {
  // Session is already validated by requireSession middleware
  // For now, just acknowledge (WS presence is handled separately)
  return c.json({ ok: true });
});

// GET /api/rooms/:id/messages — paginated message history
roomRoutes.get('/rooms/:id/messages', requireSession, async (c) => {
  const roomId = c.req.param('id');
  const before = c.req.query('before');
  const limit = Math.min(Number(c.req.query('limit')) || 50, 100);
  const db = getDb();

  let query = db.select().from(schema.messages).where(eq(schema.messages.roomId, roomId));

  // If before cursor is provided, fetch messages older than that message
  if (before) {
    const cursorRows = await db
      .select({ createdAt: schema.messages.createdAt })
      .from(schema.messages)
      .where(eq(schema.messages.id, before))
      .limit(1);

    if (cursorRows[0]) {
      query = query.where(lt(schema.messages.createdAt, cursorRows[0].createdAt));
    }
  }

  const rows = await query.orderBy(schema.messages.createdAt, 'desc').limit(limit + 1); // Fetch one extra to detect hasMore

  const hasMore = rows.length > limit;
  const messages = (hasMore ? rows.slice(0, limit) : rows).reverse();

  return c.json({
    messages: messages.map((m) => ({
      id: m.id,
      senderName: m.senderName,
      content: m.content,
      iv: m.iv,
      type: m.type,
      createdAt: m.createdAt,
    })),
    hasMore,
  });
});

// POST /api/rooms/:id/validate-session
roomRoutes.post('/rooms/:id/validate-session', async (c) => {
  const sessionToken = c.req.header('x-session-token');
  if (!sessionToken) {
    return c.json({ valid: false }, 401);
  }

  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  const tokenRows = await db
    .select()
    .from(schema.roomTokens)
    .where(eq(schema.roomTokens.id, sessionToken))
    .limit(1);

  const token = tokenRows[0];
  if (!token || token.type !== 'session' || token.expiresAt < now) {
    return c.json({ valid: false }, 200);
  }

  const roomRows = await db
    .select()
    .from(schema.rooms)
    .where(eq(schema.rooms.id, token.roomId))
    .limit(1);

  const room = roomRows[0];
  if (!room || room.expiresAt < now) {
    return c.json({ valid: false, room: null }, 200);
  }

  return c.json({
    valid: true,
    room: {
      name: room.name,
      expiresAt: room.expiresAt,
      salt: room.salt,
    },
  });
});

export { roomRoutes };
