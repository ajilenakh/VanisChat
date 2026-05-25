import { useRef } from 'react';
import type { Message } from '../../lib/api';
import { MessageItem } from './MessageItem';

interface MessageListProps {
  messages: Message[];
  decryptMessage: (content: string, iv: string) => string | null;
  ownNickname: string;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

export function MessageList({
  messages,
  decryptMessage,
  ownNickname,
  loading,
  hasMore,
  onLoadMore,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  const prevLength = useRef(messages.length);
  if (messages.length !== prevLength.current) {
    prevLength.current = messages.length;
    // Use rAF to scroll after render
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // Scroll to maintain position when loading older messages
  const handleScroll = () => {
    if (!containerRef.current) return;
    if (containerRef.current.scrollTop < 100 && hasMore && !loading) {
      onLoadMore();
    }
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-2 space-y-1"
    >
      {loading && messages.length === 0 && (
        <div className="flex items-center justify-center h-full text-gray-400">
          Loading messages...
        </div>
      )}

      {!loading && messages.length === 0 && (
        <div className="flex items-center justify-center h-full text-gray-400">
          No messages yet. Say something!
        </div>
      )}

      {hasMore && (
        <button
          type="button"
          onClick={onLoadMore}
          className="w-full text-center text-sm text-blue-600 py-2 hover:text-blue-800"
        >
          Load older messages
        </button>
      )}

      {messages.map((msg) => (
        <MessageItem
          key={msg.id}
          message={msg}
          isOwn={msg.senderName === ownNickname}
          decryptedContent={msg.type === 'text' ? decryptMessage(msg.content, msg.iv) : msg.content}
        />
      ))}

      <div ref={bottomRef} />
    </div>
  );
}
