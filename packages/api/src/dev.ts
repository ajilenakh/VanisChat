import app from './index';
import { handleDisconnect, handleMessage } from './ws/room';

const port = process.env.PORT ? Number.parseInt(process.env.PORT) : 3001;

console.log(`Dev server on http://localhost:${port}`);

// Track active WS connections per IP for rate limiting
const activeWsConnections = new Map<string, number>();
const MAX_WS_PER_IP = 10;

// Extended websocket data with IP stored at upgrade time
interface WsClientData {
  userId: string | null;
  ip: string;
}

Bun.serve({
  fetch(req, server) {
    const url = new URL(req.url);

    // WebSocket upgrade for /ws/room/:id
    const wsMatch = url.pathname.match(/^\/ws\/room\/([^/]+)$/);
    if (wsMatch) {
      const ip =
        req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'unknown';
      const connCount = activeWsConnections.get(ip) || 0;
      if (connCount >= MAX_WS_PER_IP) {
        return new Response('Too many connections', { status: 429 });
      }
      activeWsConnections.set(ip, connCount + 1);

      const upgraded = server.upgrade(req, {
        // biome-ignore lint/suspicious/noExplicitAny: Bun WS data typing mismatch
        data: { userId: null, ip } as any,
      });
      if (upgraded) return undefined; // Socket is being upgraded
      return new Response('WebSocket upgrade failed', { status: 400 });
    }

    // Regular HTTP via Hono
    return app.fetch(req);
  },
  websocket: {
    message(ws, message) {
      handleMessage(ws, message.toString());
    },
    close(ws) {
      const wsData = ws.data as WsClientData | undefined;
      if (wsData?.ip) {
        const count = activeWsConnections.get(wsData.ip) || 1;
        if (count <= 1) {
          activeWsConnections.delete(wsData.ip);
        } else {
          activeWsConnections.set(wsData.ip, count - 1);
        }
      }
      handleDisconnect(ws);
    },
  },
  port,
});

console.log(`WebSocket server ready on ws://localhost:${port}/ws/room/:id`);
