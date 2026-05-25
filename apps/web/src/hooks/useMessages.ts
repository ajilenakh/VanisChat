import { useCallback, useEffect, useRef, useState } from 'react';
import { getMessages } from '../lib/api';
import type { Message } from '../lib/api';
import type { WSInMessage } from '../lib/ws';

export function useMessages(roomId: string, sessionToken: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const seenIds = useRef(new Set<string>());

  // Fetch initial message history
  useEffect(() => {
    if (!roomId || !sessionToken) return;

    setLoading(true);
    getMessages(roomId, sessionToken, { limit: 50 })
      .then((data) => {
        setMessages(data.messages);
        setHasMore(data.hasMore);
        for (const m of data.messages) seenIds.current.add(m.id);
      })
      .catch(() => {
        // Silently fail — messages will load on reconnect
      })
      .finally(() => setLoading(false));
  }, [roomId, sessionToken]);

  // Append WS messages (deduplicated by id)
  const appendMessage = useCallback((msg: WSInMessage) => {
    if (msg.type !== 'message') return;
    if (seenIds.current.has(msg.id)) return;

    seenIds.current.add(msg.id);
    setMessages((prev) => [
      ...prev,
      {
        id: msg.id,
        senderName: msg.senderName,
        content: msg.content,
        iv: msg.iv,
        type: 'text' as const,
        createdAt: msg.createdAt,
      },
    ]);
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || messages.length === 0) return;
    const oldest = messages[0];
    if (!oldest) return;
    const data = await getMessages(roomId, sessionToken, {
      before: oldest.id,
      limit: 50,
    });
    const newMsgs = data.messages.filter((m) => !seenIds.current.has(m.id));
    for (const m of newMsgs) seenIds.current.add(m.id);
    setMessages((prev) => [...newMsgs, ...prev]);
    setHasMore(data.hasMore);
  }, [hasMore, messages, roomId, sessionToken]);

  return { messages, hasMore, loading, appendMessage, loadMore };
}
