import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoomContext } from '../../context/RoomContext';
import { createRoom } from '../../lib/api';

export function CreateRoomForm() {
  const { setRoom } = useRoomContext();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [expirationMinutes, setExpirationMinutes] = useState(60);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [createdRoomId, setCreatedRoomId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await createRoom({ name, password, expirationMinutes, nickname });
      const url = `${window.location.origin}/room/${result.roomId}?invite=${result.inviteToken}`;
      setInviteUrl(url);
      setCreatedRoomId(result.roomId);
      setRoom({
        roomId: result.roomId,
        sessionToken: result.sessionToken,
        roomName: name,
        roomSalt: result.salt,
        roomExpiresAt: result.expiresAt,
        inviteToken: result.inviteToken,
        nickname,
        roomPassword: password,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  if (inviteUrl) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold dark:text-slate-100">Room Created!</h2>
        <p className="text-sm text-gray-600 dark:text-slate-400">
          Share this invite link with others:
        </p>
        <div className="flex gap-2">
          <input
            readOnly
            value={inviteUrl}
            className="flex-1 rounded border px-3 py-2 text-sm font-mono bg-gray-50 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 dark:placeholder-slate-400"
            onClick={(e) => e.currentTarget.select()}
          />
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(inviteUrl)}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            Copy
          </button>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/room/${createdRoomId}`)}
          className="inline-block rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
        >
          Enter Room
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold dark:text-slate-100">Create a Room</h2>

      <div>
        <label
          htmlFor="create-nickname"
          className="block text-sm font-medium mb-1 dark:text-slate-300"
        >
          Nickname
        </label>
        <input
          id="create-nickname"
          required
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="w-full rounded border px-3 py-2 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 dark:placeholder-slate-400"
          placeholder="Your display name"
          maxLength={50}
        />
      </div>

      <div>
        <label
          htmlFor="create-room-name"
          className="block text-sm font-medium mb-1 dark:text-slate-300"
        >
          Room Name
        </label>
        <input
          id="create-room-name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded border px-3 py-2 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 dark:placeholder-slate-400"
          placeholder="e.g. Project Discussion"
          maxLength={100}
        />
      </div>

      <div>
        <label
          htmlFor="create-room-password"
          className="block text-sm font-medium mb-1 dark:text-slate-300"
        >
          Password
        </label>
        <input
          id="create-room-password"
          required
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border px-3 py-2 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 dark:placeholder-slate-400"
          placeholder="Shared room password"
        />
        <p className="text-xs text-gray-500 mt-1 dark:text-slate-400">
          Used to derive the encryption key. Share with people you invite.
        </p>
      </div>

      <div>
        <label
          htmlFor="create-expiration"
          className="block text-sm font-medium mb-1 dark:text-slate-300"
        >
          Room expires in: {expirationMinutes} min
        </label>
        <input
          id="create-expiration"
          type="range"
          min={1}
          max={1440}
          value={expirationMinutes}
          onChange={(e) => setExpirationMinutes(Number(e.target.value))}
          className="w-full dark:accent-blue-400"
        />
        <div className="flex justify-between text-xs text-gray-400 dark:text-slate-500">
          <span>1 min</span>
          <span>24 hrs</span>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Creating...
          </>
        ) : (
          'Create Room'
        )}
      </button>
    </form>
  );
}
