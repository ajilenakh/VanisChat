import { useState } from 'react';
import { CreateRoomForm } from './CreateRoomForm';
import { JoinRoomForm } from './JoinRoomForm';

type Tab = 'create' | 'join';

export function LobbyPage() {
  const [tab, setTab] = useState<Tab>('create');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-lg p-6">
        <h1 className="text-2xl font-bold text-center mb-6">VanisChat</h1>

        <div className="flex mb-6 border-b">
          <button
            type="button"
            onClick={() => setTab('create')}
            className={`flex-1 pb-2 text-sm font-medium text-center border-b-2 transition-colors ${
              tab === 'create'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Create Room
          </button>
          <button
            type="button"
            onClick={() => setTab('join')}
            className={`flex-1 pb-2 text-sm font-medium text-center border-b-2 transition-colors ${
              tab === 'join'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
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
