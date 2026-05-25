import type { Message } from '../../lib/api';

interface MessageItemProps {
  message: Message;
  isOwn: boolean;
  decryptedContent: string | null;
}

export function MessageItem({ message, isOwn, decryptedContent }: MessageItemProps) {
  const time = new Date(message.createdAt * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (message.type === 'system') {
    return (
      <div className="text-center text-sm text-gray-400 py-2 italic">
        {decryptedContent || message.content}
      </div>
    );
  }

  const displayContent = decryptedContent ?? '[Decryption failed]';
  const isFailed = decryptedContent === null && message.type === 'text';

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`max-w-[75%] rounded-lg px-3 py-2 ${
          isOwn
            ? 'bg-blue-600 text-white'
            : isFailed
              ? 'bg-red-50 text-red-600 border border-red-200'
              : 'bg-gray-100 text-gray-900'
        }`}
      >
        {!isOwn && (
          <p className={`text-xs font-medium mb-1 ${isOwn ? 'text-blue-200' : 'text-gray-500'}`}>
            {message.senderName}
          </p>
        )}
        <p className="text-sm whitespace-pre-wrap break-words">{displayContent}</p>
        <p className={`text-xs mt-1 ${isOwn ? 'text-blue-200' : 'text-gray-400'} text-right`}>
          {time}
        </p>
      </div>
    </div>
  );
}
