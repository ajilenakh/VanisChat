import { encrypt } from '@vanischat/crypto';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRoomContext } from '../../context/RoomContext';
import { useCryptoKey } from '../../hooks/useCryptoKey';
import { useMessages } from '../../hooks/useMessages';
import { usePresence } from '../../hooks/usePresence';
import { useRoom } from '../../hooks/useRoom';
import { leaveRoom } from '../../lib/api';
import { ChatHeader } from './ChatHeader';
import { MessageInput } from './MessageInput';
import { MessageList } from './MessageList';

export function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state, clearRoom } = useRoomContext();
  const [expired, setExpired] = useState(false);

  const roomId = id || state.roomId || '';
  const sessionToken = state.sessionToken || '';

  // Derive encryption key from the actual room password (not session token)
  const { ready: keyReady, decryptMessage } = useCryptoKey(state.roomPassword, state.roomSalt);

  const { onlineCount, typingUsers, handlePresenceMessage } = usePresence();

  const onWSMessage = useCallback(
    (msg: Parameters<typeof handlePresenceMessage>[0]) => {
      handlePresenceMessage(msg);
      if (msg.type === 'room_expired') setExpired(true);
    },
    [handlePresenceMessage],
  );

  const { connected, sendMessage, sendTyping } = useRoom({
    roomId,
    sessionToken,
    onMessage: (msg) => {
      onWSMessage(msg);
      appendMessage(msg);
    },
  });

  const { messages, loading, hasMore, appendMessage, loadMore } = useMessages(roomId, sessionToken);

  const handleSend = useCallback(
    async (text: string) => {
      if (!keyReady) return;
      try {
        const saltBytes = new Uint8Array(
          state.roomSalt!.match(/.{1,2}/g)!.map((byte) => Number.parseInt(byte, 16)),
        );
        // Re-derive for encrypt (or cache it — simplified for now)
        const { deriveKey } = await import('@vanischat/crypto');
        const key = await deriveKey(state.roomPassword!, saltBytes);
        const result = await encrypt(text, key);
        sendMessage(result.ciphertext, result.iv);
      } catch {
        // Encryption failed
      }
    },
    [keyReady, sendMessage, state.roomPassword, state.roomSalt],
  );

  const handleLeave = async () => {
    try {
      if (sessionToken) await leaveRoom(roomId, sessionToken);
    } catch {
      /* ignore */
    }
    clearRoom();
    navigate('/');
  };

  const typingNicknames = Array.from(typingUsers.keys()).filter((n) => n !== state.nickname);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <ChatHeader
        roomName={state.roomName || 'Chat Room'}
        expiresAt={state.roomExpiresAt || 0}
        onlineCount={onlineCount}
        roomId={roomId}
        onLeave={handleLeave}
      />

      <MessageList
        messages={messages}
        decryptMessage={decryptMessage}
        ownNickname={state.nickname || ''}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={loadMore}
      />

      {typingNicknames.length > 0 && (
        <div className="px-4 py-1 text-xs text-gray-400 italic">
          {typingNicknames.join(', ')} typing...
        </div>
      )}

      <MessageInput onSend={handleSend} onTyping={sendTyping} disabled={expired || !connected} />

      {expired && (
        <div className="text-center text-sm text-red-600 py-2 bg-red-50 border-t border-red-200">
          This room has expired.
        </div>
      )}

      {!connected && !expired && (
        <div className="text-center text-sm text-amber-600 py-2 bg-amber-50 border-t border-amber-200">
          Reconnecting...
        </div>
      )}
    </div>
  );
}
