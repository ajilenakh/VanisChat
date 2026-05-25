import { createId } from '@paralleldrive/cuid2';
import type { ServerWebSocket } from 'bun';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '../db';

interface RoomClient {
  ws: ServerWebSocket;
  userId: string;
  nickname: string;
  roomId: string;
  alive: boolean;
  missedHeartbeats: number;
}

// In-memory room state: roomId -> Map<userId, RoomClient>
const rooms = new Map<string, Map<string, RoomClient>>();
const userSockets = new Map<string, RoomClient>();

type WSMessage =
  | { type: 'auth'; sessionToken: string }
  | { type: 'send_message'; content: string; iv: string }
  | { type: 'typing'; isTyping: boolean }
  | { type: 'heartbeat_ack' };

async function handleMessage(ws: ServerWebSocket, raw: string) {
  let msg: WSMessage;
  try {
    msg = JSON.parse(raw);
  } catch {
    ws.send(JSON.stringify({ type: 'error', code: 'parse_error', message: 'Invalid JSON' }));
    return;
  }

  const client = userSockets.get(ws.data?.userId);
  if (!client && msg.type !== 'auth') {
    ws.send(
      JSON.stringify({ type: 'error', code: 'not_authenticated', message: 'Send auth first' }),
    );
    return;
  }

  switch (msg.type) {
    case 'auth':
      await handleAuth(ws, msg.sessionToken);
      break;
    case 'send_message':
      if (client) await handleSendMessage(client, msg.content, msg.iv);
      break;
    case 'typing':
      if (client) handleTyping(client, msg.isTyping);
      break;
    case 'heartbeat_ack':
      if (client) client.alive = true;
      break;
  }
}

async function handleAuth(ws: ServerWebSocket, sessionToken: string) {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  const tokenRows = await db
    .select()
    .from(schema.roomTokens)
    .where(eq(schema.roomTokens.id, sessionToken))
    .limit(1);

  const token = tokenRows[0];
  if (!token || token.type !== 'session' || token.expiresAt < now) {
    ws.send(JSON.stringify({ type: 'error', code: 'invalid_session' }));
    ws.close(4001, 'Invalid session');
    return;
  }

  const roomRows = await db
    .select()
    .from(schema.rooms)
    .where(eq(schema.rooms.id, token.roomId))
    .limit(1);

  const room = roomRows[0];
  if (!room || room.expiresAt < now) {
    ws.send(JSON.stringify({ type: 'room_expired' }));
    ws.close(4002, 'Room expired');
    return;
  }

  // Check if user is reconnecting (same session token)
  const existingClient = userSockets.get(sessionToken);
  const isReconnect = existingClient?.roomId === token.roomId;

  // Clean up old connection if this is a reconnect
  if (existingClient) {
    existingClient.ws.close(4000, 'Reconnected elsewhere');
    rooms.get(token.roomId)?.delete(sessionToken);
  }

  const nickname = token.nickname || `User_${sessionToken.slice(0, 6)}`;

  const client: RoomClient = {
    ws,
    userId: sessionToken,
    nickname,
    roomId: token.roomId,
    alive: true,
    missedHeartbeats: 0,
  };

  ws.data = { userId: sessionToken };
  userSockets.set(sessionToken, client);

  if (!rooms.has(token.roomId)) {
    rooms.set(token.roomId, new Map());
  }
  rooms.get(token.roomId)!.set(sessionToken, client);

  ws.send(JSON.stringify({ type: 'auth_ok', roomId: token.roomId }));

  if (!isReconnect) {
    broadcastToRoom(
      token.roomId,
      {
        type: 'user_joined',
        nickname: client.nickname,
        onlineCount: rooms.get(token.roomId)!.size,
      },
      sessionToken,
    );
  }
}

async function handleSendMessage(client: RoomClient, content: string, iv: string) {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  // Verify room hasn't expired
  const roomRows = await db
    .select({ expiresAt: schema.rooms.expiresAt })
    .from(schema.rooms)
    .where(eq(schema.rooms.id, client.roomId))
    .limit(1);

  if (!roomRows[0] || roomRows[0].expiresAt < now) {
    client.ws.send(JSON.stringify({ type: 'room_expired' }));
    broadcastToRoom(client.roomId, {
      type: 'user_left',
      nickname: client.nickname,
      onlineCount: (rooms.get(client.roomId)?.size || 1) - 1,
    });
    return;
  }

  const messageId = createId();
  const msg = {
    id: messageId,
    senderName: client.nickname,
    content,
    iv,
    type: 'text' as const,
    createdAt: now,
  };

  // Persist to DB
  await db.insert(schema.messages).values({
    id: messageId,
    roomId: client.roomId,
    senderName: client.nickname,
    content,
    iv,
    type: 'text',
  });

  // Relay to all clients in room
  broadcastToRoom(client.roomId, { type: 'message', ...msg });
}

function handleTyping(client: RoomClient, isTyping: boolean) {
  broadcastToRoom(
    client.roomId,
    {
      type: 'typing',
      nickname: client.nickname,
      isTyping,
    },
    client.userId,
  );
}

function broadcastToRoom(roomId: string, message: Record<string, unknown>, excludeUserId?: string) {
  const room = rooms.get(roomId);
  if (!room) return;

  const payload = JSON.stringify(message);
  for (const [userId, client] of room) {
    if (userId !== excludeUserId) {
      try {
        client.ws.send(payload);
      } catch {
        // Socket may be dead, clean up
        room.delete(userId);
        userSockets.delete(userId);
      }
    }
  }
}

export function handleDisconnect(ws: ServerWebSocket) {
  const userId = ws.data?.userId;
  if (!userId) return;

  const client = userSockets.get(userId);
  if (!client) return;

  const room = rooms.get(client.roomId);
  if (room) {
    room.delete(userId);
    broadcastToRoom(client.roomId, {
      type: 'user_left',
      nickname: client.nickname,
      onlineCount: room.size,
    });
    if (room.size === 0) rooms.delete(client.roomId);
  }

  userSockets.delete(userId);
}

// Heartbeat check every 30s — disconnect after 3 missed acks
setInterval(() => {
  for (const [_userId, client] of userSockets) {
    if (!client.alive) {
      client.missedHeartbeats++;
      if (client.missedHeartbeats >= 3) {
        try {
          client.ws.close(4000, 'Heartbeat timeout');
        } catch {
          /* ignore */
        }
        handleDisconnect(client.ws);
        continue;
      }
    } else {
      client.missedHeartbeats = 0;
    }

    client.alive = false;
    try {
      client.ws.send(JSON.stringify({ type: 'heartbeat' }));
    } catch {
      handleDisconnect(client.ws);
    }
  }
}, 30_000);

export { handleMessage };
