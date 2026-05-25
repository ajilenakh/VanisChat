export type WSInMessage =
  | { type: 'auth_ok'; roomId: string }
  | {
      type: 'message';
      id: string;
      senderName: string;
      content: string;
      iv: string;
      createdAt: number;
    }
  | { type: 'user_joined'; nickname: string; onlineCount: number }
  | { type: 'user_left'; nickname: string; onlineCount: number }
  | { type: 'typing'; nickname: string; isTyping: boolean }
  | { type: 'heartbeat' }
  | { type: 'error'; code: string; message: string }
  | { type: 'room_expired' };

export type WSOutMessage =
  | { type: 'auth'; sessionToken: string }
  | { type: 'send_message'; content: string; iv: string }
  | { type: 'typing'; isTyping: boolean }
  | { type: 'heartbeat_ack' };

type MessageHandler = (msg: WSInMessage) => void;

export class RoomSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private sessionToken: string;
  private handlers = new Set<MessageHandler>();
  private reconnectAttempts = 0;
  private maxInterval = 30_000;
  private closed = false;

  constructor(roomId: string, sessionToken: string) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    this.url = `${protocol}//${host}/ws/room/${roomId}`;
    this.sessionToken = sessionToken;
  }

  connect() {
    if (this.closed) return;
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.send({ type: 'auth', sessionToken: this.sessionToken });
    };

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data) as WSInMessage;

      if (msg.type === 'heartbeat') {
        this.send({ type: 'heartbeat_ack' });
      }

      for (const handler of this.handlers) handler(msg);
    };

    this.ws.onclose = () => {
      if (this.closed) return;
      const delay = Math.min(1000 * 2 ** this.reconnectAttempts, this.maxInterval);
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), delay);
    };

    this.ws.onerror = () => {
      // onclose fires after onerror, triggering reconnection
    };
  }

  send(msg: WSOutMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  close() {
    this.closed = true;
    this.ws?.close();
    this.ws = null;
  }
}
