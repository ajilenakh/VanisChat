import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoomContext } from '../../context/RoomContext';
import { joinRoom } from '../../lib/api';

export function JoinRoomForm() {
  const { setRoom } = useRoomContext();
  const navigate = useNavigate();

  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [roomId, setRoomId] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    let effectiveRoomId = roomId;
    let effectiveInviteToken = inviteToken;

    if (inviteToken.includes('/room/')) {
      const match = inviteToken.match(/\/room\/([^?]+)\?invite=([^&\s]+)/);
      if (match) {
        effectiveRoomId = match[1]!;
        effectiveInviteToken = match[2]!;
      }
    }

    if (!effectiveRoomId || !effectiveInviteToken) {
      setError('Room ID and invite token are required');
      setLoading(false);
      return;
    }

    try {
      const result = await joinRoom(effectiveRoomId, {
        inviteToken: effectiveInviteToken,
        nickname,
        password,
      });

      setRoom({
        roomId: effectiveRoomId,
        sessionToken: result.sessionToken,
        roomName: result.room.name,
        roomSalt: result.room.salt,
        roomExpiresAt: result.room.expiresAt,
        nickname,
        roomPassword: password,
      });

      navigate(`/room/${effectiveRoomId}`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to join room');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold">Join a Room</h2>

      <div>
        <label htmlFor="join-nickname" className="block text-sm font-medium mb-1">
          Nickname
        </label>
        <input
          id="join-nickname"
          required
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="w-full rounded border px-3 py-2 text-sm"
          placeholder="Your display name"
          maxLength={50}
        />
      </div>

      <div>
        <label htmlFor="join-invite-token" className="block text-sm font-medium mb-1">
          Room ID or Invite Link
        </label>
        <input
          id="join-invite-token"
          required
          value={inviteToken}
          onChange={(e) => {
            setInviteToken(e.target.value);
            const match = e.target.value.match(/\/room\/([^?]+)/);
            if (match?.[1]) setRoomId(match[1]);
          }}
          className="w-full rounded border px-3 py-2 text-sm font-mono"
          placeholder="Paste invite link or token"
        />
      </div>

      {!roomId && (
        <div>
          <label htmlFor="join-room-id" className="block text-sm font-medium mb-1">
            Room ID
          </label>
          <input
            id="join-room-id"
            required
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm font-mono"
            placeholder="room_abc123"
          />
        </div>
      )}

      <div>
        <label htmlFor="join-password" className="block text-sm font-medium mb-1">
          Password
        </label>
        <input
          id="join-password"
          required
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border px-3 py-2 text-sm"
          placeholder="Room password"
        />
        <p className="text-xs text-gray-500 mt-1">
          Used to derive the encryption key. Must match the room's password.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? 'Joining...' : 'Join Room'}
      </button>
    </form>
  );
}
