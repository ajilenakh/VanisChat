import { Clock, Copy, LogOut, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ChatHeaderProps {
  roomName: string;
  expiresAt: number;
  onlineCount: number;
  roomId: string;
  onLeave: () => void;
}

export function ChatHeader({ roomName, expiresAt, onlineCount, roomId, onLeave }: ChatHeaderProps) {
  const [timeLeft, setTimeLeft] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = expiresAt - now;
      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }
      const mins = Math.floor(diff / 60);
      const secs = diff % 60;
      setTimeLeft(`${mins}:${String(secs).padStart(2, '0')}`);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const copyInviteLink = async () => {
    const url = `${window.location.origin}/room/${roomId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="flex items-center justify-between border-b px-4 py-3 bg-white">
      <div className="flex items-center gap-3">
        <h2 className="font-semibold text-lg truncate max-w-40">{roomName}</h2>
        <span className="flex items-center gap-1 text-sm text-gray-500">
          <Users size={14} />
          {onlineCount}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1 text-sm text-gray-500">
          <Clock size={14} />
          {timeLeft}
        </span>

        <button
          type="button"
          onClick={copyInviteLink}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
          title="Copy invite link"
        >
          <Copy size={14} />
          {copied ? 'Copied!' : 'Invite'}
        </button>

        <button
          type="button"
          onClick={onLeave}
          className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800"
          title="Leave room"
        >
          <LogOut size={14} />
          Leave
        </button>
      </div>
    </header>
  );
}
