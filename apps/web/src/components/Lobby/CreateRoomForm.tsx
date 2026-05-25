import { useState } from 'react';
import { useRoomContext } from '../../context/RoomContext';
import { createRoom } from '../../lib/api';

export function CreateRoomForm() {
  const { setRoom } = useRoomContext();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [expirationMinutes, setExpirationMinutes] = useState(60);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await createRoom({ name, password, expirationMinutes, nickname });
      const url = `${window.location.origin}/room/${result.roomId}?invite=${result.inviteToken}`;
      setInviteUrl(url);
      setRoom({
        roomId: result.roomId,
        roomName: name,
        inviteToken: result.inviteToken,
        nickname,
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
        <h2 className="text-lg font-semibold">Room Created!</h2>
        <p className="text-sm text-gray-600">Share this invite link with others:</p>
        <div className="flex gap-2">
          <input
            readOnly
            value={inviteUrl}
            className="flex-1 rounded border px-3 py-2 text-sm font-mono bg-gray-50"
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
        <a
          href={`/room/${inviteUrl.split('/room/')[1]?.split('?')[0]}`}
          className="inline-block rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
        >
          Enter Room
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold">Create a Room</h2>

      <div>
        <label htmlFor="create-nickname" className="block text-sm font-medium mb-1">
          Nickname
        </label>
        <input
          id="create-nickname"
          required
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="w-full rounded border px-3 py-2 text-sm"
          placeholder="Your display name"
          maxLength={50}
        />
      </div>

      <div>
        <label htmlFor="create-room-name" className="block text-sm font-medium mb-1">
          Room Name
        </label>
        <input
          id="create-room-name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded border px-3 py-2 text-sm"
          placeholder="e.g. Project Discussion"
          maxLength={100}
        />
      </div>

      <div>
        <label htmlFor="create-room-password" className="block text-sm font-medium mb-1">
          Password
        </label>
        <input
          id="create-room-password"
          required
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border px-3 py-2 text-sm"
          placeholder="Shared room password"
        />
        <p className="text-xs text-gray-500 mt-1">
          Used to derive the encryption key. Share with people you invite.
        </p>
      </div>

      <div>
        <label htmlFor="create-expiration" className="block text-sm font-medium mb-1">
          Room expires in: {expirationMinutes} min
        </label>
        <input
          id="create-expiration"
          type="range"
          min={1}
          max={1440}
          value={expirationMinutes}
          onChange={(e) => setExpirationMinutes(Number(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>1 min</span>
          <span>24 hrs</span>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Creating...' : 'Create Room'}
      </button>
    </form>
  );
}
