import { type ReactNode, createContext, useContext, useState } from 'react';

interface RoomState {
  roomId: string | null;
  sessionToken: string | null;
  roomName: string | null;
  roomSalt: string | null;
  roomExpiresAt: number | null;
  nickname: string | null;
  inviteToken: string | null;
}

interface RoomContextValue {
  state: RoomState;
  setRoom: (room: Partial<RoomState>) => void;
  clearRoom: () => void;
}

const defaultState: RoomState = {
  roomId: null,
  sessionToken: null,
  roomName: null,
  roomSalt: null,
  roomExpiresAt: null,
  nickname: null,
  inviteToken: null,
};

const RoomContext = createContext<RoomContextValue | null>(null);

export function RoomProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RoomState>(defaultState);

  const setRoom = (partial: Partial<RoomState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  };

  const clearRoom = () => {
    setState(defaultState);
  };

  return (
    <RoomContext.Provider value={{ state, setRoom, clearRoom }}>{children}</RoomContext.Provider>
  );
}

export function useRoomContext() {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error('useRoomContext must be used within RoomProvider');
  return ctx;
}
