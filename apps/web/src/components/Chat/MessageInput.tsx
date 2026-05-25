import { Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface MessageInputProps {
  onSend: (text: string) => void;
  onTyping: (isTyping: boolean) => void;
  disabled: boolean;
}

export function MessageInput({ onSend, onTyping, disabled }: MessageInputProps) {
  const [text, setText] = useState('');
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => clearTimeout(typingTimeout.current);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);

    // Emit typing indicator
    onTyping(true);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => onTyping(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
    onTyping(false);
    clearTimeout(typingTimeout.current);
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t px-4 py-3 bg-white">
      <input
        id="message-input"
        value={text}
        onChange={handleChange}
        disabled={disabled}
        placeholder={disabled ? 'Room expired...' : 'Type a message...'}
        className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        maxLength={10000}
      />
      <button
        type="submit"
        disabled={!text.trim() || disabled}
        className="rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        <Send size={18} />
      </button>
    </form>
  );
}
