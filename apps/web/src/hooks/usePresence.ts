import { useCallback, useState } from 'react';
import type { WSInMessage } from '../lib/ws';

export function usePresence() {
  const [onlineCount, setOnlineCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState<Map<string, boolean>>(new Map());

  const handlePresenceMessage = useCallback((msg: WSInMessage) => {
    if (msg.type === 'user_joined') {
      setOnlineCount(msg.onlineCount);
    }
    if (msg.type === 'user_left') {
      setOnlineCount(msg.onlineCount);
      setTypingUsers((prev) => {
        const next = new Map(prev);
        next.delete(msg.nickname);
        return next;
      });
    }
    if (msg.type === 'typing') {
      setTypingUsers((prev) => {
        const next = new Map(prev);
        if (msg.isTyping) {
          next.set(msg.nickname, true);
        } else {
          next.delete(msg.nickname);
        }
        return next;
      });
    }
  }, []);

  return { onlineCount, typingUsers, handlePresenceMessage };
}
