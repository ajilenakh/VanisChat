import { Clock, Copy, LogOut, Moon, Sun, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRoomContext } from '../../context/RoomContext';
import { useToast } from '../../lib/toast';

interface ChatHeaderProps {
  roomName: string;
  expiresAt: number | null;
  onlineCount: number;
  roomId: string;
  onLeave: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export function ChatHeader({
  roomName,
  expiresAt,
  onlineCount,
  roomId,
  onLeave,
  theme,
  onToggleTheme,
}: ChatHeaderProps) {
  const [timeLeft, setTimeLeft] = useState('');
  const { addToast } = useToast();
  const { state } = useRoomContext();

  useEffect(() => {
    const update = () => {
      if (expiresAt == null) {
        setTimeLeft('');
        return;
      }
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
    const urlToken = new URLSearchParams(window.location.search).get('invite') || state.inviteToken;
    const url = urlToken
      ? `${window.location.origin}/room/${roomId}?invite=${urlToken}`
      : `${window.location.origin}/room/${roomId}`;
    await navigator.clipboard.writeText(url);
    addToast('Invite link copied!', 'success');
  };

  const diff = expiresAt != null ? expiresAt - Math.floor(Date.now() / 1000) : null;
  const isWarning = diff != null && diff > 0 && diff < 300; // < 5 minutes

  return (
    <header className="flex items-center justify-between border-b px-4 py-3 bg-white dark:bg-slate-900 dark:border-slate-700">
      <div className="flex items-center gap-3 min-w-0">
        <h2 className="font-semibold text-lg truncate dark:text-slate-100">{roomName}</h2>
        <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-slate-400">
          <Users size={14} />
          <span className="hidden sm:inline">{onlineCount} online</span>
          <span className="sm:hidden">{onlineCount}</span>
        </span>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span
          className={`flex items-center gap-1 text-sm font-mono ${
            isWarning
              ? 'text-red-600 dark:text-red-400 font-semibold'
              : 'text-gray-500 dark:text-slate-400'
          }`}
        >
          <Clock size={14} />
          {timeLeft}
        </span>

        <button
          type="button"
          onClick={onToggleTheme}
          className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button
          type="button"
          onClick={copyInviteLink}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          title="Copy invite link"
        >
          <Copy size={14} />
          <span className="hidden sm:inline">Invite</span>
        </button>

        <button
          type="button"
          onClick={onLeave}
          className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
          title="Leave room"
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">Leave</span>
        </button>
      </div>
    </header>
  );
}
