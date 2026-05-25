import { useCallback, useEffect, useRef, useState } from 'react';
import { RoomSocket } from '../lib/ws';
import type { WSInMessage } from '../lib/ws';

interface UseRoomOptions {
  roomId: string;
  sessionToken: string;
  onMessage?: (msg: WSInMessage) => void;
}

export function useRoom({ roomId, sessionToken, onMessage }: UseRoomOptions) {
  const socketRef = useRef<RoomSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!roomId || !sessionToken) return;

    const socket = new RoomSocket(roomId, sessionToken);
    socketRef.current = socket;

    const unsub = socket.onMessage((msg) => {
      if (msg.type === 'auth_ok') {
        setConnected(true);
        setError(null);
      }
      if (msg.type === 'error') {
        setError(msg.message);
      }
      onMessageRef.current?.(msg);
    });

    socket.connect();

    return () => {
      unsub();
      socket.close();
      socketRef.current = null;
      setConnected(false);
    };
  }, [roomId, sessionToken]);

  const sendMessage = useCallback((content: string, iv: string) => {
    socketRef.current?.send({ type: 'send_message', content, iv });
  }, []);

  const sendTyping = useCallback((isTyping: boolean) => {
    socketRef.current?.send({ type: 'typing', isTyping });
  }, []);

  return { connected, error, sendMessage, sendTyping };
}
