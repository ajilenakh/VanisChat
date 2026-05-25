import app from './index';
import { handleDisconnect, handleMessage } from './ws/room';

const port = process.env.PORT ? Number.parseInt(process.env.PORT) : 3001;

console.log(`Dev server on http://localhost:${port}`);

Bun.serve({
  fetch(req, server) {
    const url = new URL(req.url);

    // WebSocket upgrade for /ws/room/:id
    const wsMatch = url.pathname.match(/^\/ws\/room\/([^/]+)$/);
    if (wsMatch) {
      const upgraded = server.upgrade(req, {
        // biome-ignore lint/suspicious/noExplicitAny: Bun WS data typing mismatch
        data: { userId: null } as any,
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
      handleDisconnect(ws);
    },
  },
  port,
});

console.log(`WebSocket server ready on ws://localhost:${port}/ws/room/:id`);
