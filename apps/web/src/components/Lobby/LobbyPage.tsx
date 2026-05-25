import { Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { CreateRoomForm } from './CreateRoomForm';
import { JoinRoomForm } from './JoinRoomForm';

type Tab = 'create' | 'join';

export function LobbyPage() {
  const [tab, setTab] = useState<Tab>('create');
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 p-4 pb-[env(safe-area-inset-bottom)] transition-colors">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-800 shadow-lg dark:shadow-slate-900/50 p-6 transition-colors">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">VanisChat</h1>
          <button
            type="button"
            onClick={toggleTheme}
            className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        <div className="flex mb-6 border-b dark:border-slate-600">
          <button
            type="button"
            onClick={() => setTab('create')}
            className={`flex-1 pb-2 text-sm font-medium text-center border-b-2 transition-colors ${
              tab === 'create'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            Create Room
          </button>
          <button
            type="button"
            onClick={() => setTab('join')}
            className={`flex-1 pb-2 text-sm font-medium text-center border-b-2 transition-colors ${
              tab === 'join'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            Join Room
          </button>
        </div>

        {tab === 'create' ? <CreateRoomForm /> : <JoinRoomForm />}
      </div>
    </div>
  );
}
