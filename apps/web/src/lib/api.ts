const API_BASE = '';

interface CreateRoomResponse {
  roomId: string;
  inviteToken: string;
  sessionToken: string;
  salt: string;
  expiresAt: number;
}

interface JoinRoomResponse {
  sessionToken: string;
  messages: Message[];
  room: RoomInfo;
}

interface RoomInfo {
  name: string;
  expiresAt: number;
  salt: string;
}

export interface Message {
  id: string;
  senderName: string;
  content: string;
  iv: string;
  type: 'text' | 'image' | 'file' | 'system';
  createdAt: number;
  fileUrl?: string;
  fileType?: string;
}

interface MessagesResponse {
  messages: Message[];
  hasMore: boolean;
}

interface ValidateSessionResponse {
  valid: boolean;
  room?: RoomInfo;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'content-type': 'application/json', ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      res.status,
      body.error || 'unknown',
      body.message || res.statusText,
      body.retryAfter,
    );
  }

  return res.json();
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public retryAfter?: number,
  ) {
    super(message);
  }
}

export function createRoom(data: {
  name: string;
  password: string;
  expirationMinutes: number;
  nickname: string;
}): Promise<CreateRoomResponse> {
  return request('/api/rooms', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function joinRoom(
  roomId: string,
  data: { inviteToken: string; nickname: string; password: string },
): Promise<JoinRoomResponse> {
  return request(`/api/rooms/${roomId}/join`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function leaveRoom(roomId: string, sessionToken: string): Promise<{ ok: boolean }> {
  return request(`/api/rooms/${roomId}/leave`, {
    method: 'POST',
    headers: { 'x-session-token': sessionToken },
    body: '{}',
  });
}

export function getMessages(
  roomId: string,
  sessionToken: string,
  options?: { before?: string; limit?: number },
): Promise<MessagesResponse> {
  const params = new URLSearchParams();
  if (options?.before) params.set('before', options.before);
  if (options?.limit) params.set('limit', String(options.limit));
  const qs = params.toString();

  return request(`/api/rooms/${roomId}/messages${qs ? `?${qs}` : ''}`, {
    headers: { 'x-session-token': sessionToken },
  });
}

interface UploadUrlResponse {
  uploadUrl: string;
  fileUrl: string;
  key: string;
  expiresIn: number;
}

export function requestUploadUrl(
  roomId: string,
  sessionToken: string,
  data: { fileName: string; fileType: string; fileSize: number },
): Promise<UploadUrlResponse> {
  return request(`/api/rooms/${roomId}/upload-url`, {
    method: 'POST',
    headers: { 'x-session-token': sessionToken },
    body: JSON.stringify(data),
  });
}

export function validateSession(
  roomId: string,
  sessionToken: string,
): Promise<ValidateSessionResponse> {
  return request(`/api/rooms/${roomId}/validate-session`, {
    method: 'POST',
    headers: { 'x-session-token': sessionToken },
    body: '{}',
  });
}
