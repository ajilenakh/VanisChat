import { describe, expect, it } from 'vitest';
import app from '../index';

describe('POST /api/rooms', () => {
  it('creates a room and returns roomId, inviteToken, expiresAt', async () => {
    const res = await app.request('/api/rooms', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Room',
        password: 'secret',
        expirationMinutes: 60,
        nickname: 'Alice',
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('roomId');
    expect(body).toHaveProperty('inviteToken');
    expect(body).toHaveProperty('expiresAt');
    expect(typeof body.inviteToken).toBe('string');
  });

  it('returns 400 for missing required fields', async () => {
    const res = await app.request('/api/rooms', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Test' }), // missing password, nickname
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('validation_error');
  });
});

describe('POST /api/rooms/:id/join', () => {
  it('joins a room with valid invite token and returns sessionToken + messages', async () => {
    // First create a room
    const createRes = await app.request('/api/rooms', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Join Test',
        password: 'secret',
        expirationMinutes: 60,
        nickname: 'Alice',
      }),
    });
    const { roomId, inviteToken } = (await createRes.json()) as {
      roomId: string;
      inviteToken: string;
    };

    // Join with the invite token
    const joinRes = await app.request(`/api/rooms/${roomId}/join`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        inviteToken,
        nickname: 'Bob',
        password: 'secret',
      }),
    });

    expect(joinRes.status).toBe(200);
    const body = await joinRes.json();
    expect(body).toHaveProperty('sessionToken');
    expect(body).toHaveProperty('messages');
    expect(Array.isArray(body.messages)).toBe(true);
    expect(body).toHaveProperty('room');
    expect(body.room).toHaveProperty('name', 'Join Test');
    expect(body.room).toHaveProperty('expiresAt');
    expect(body.room).toHaveProperty('salt');
  });

  it('returns 401 for reusing the same invite token', async () => {
    const createRes = await app.request('/api/rooms', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'One-Time Token',
        password: 'pw',
        expirationMinutes: 60,
        nickname: 'Alice',
      }),
    });
    const { roomId, inviteToken } = (await createRes.json()) as {
      roomId: string;
      inviteToken: string;
    };

    // First join — should succeed
    await app.request(`/api/rooms/${roomId}/join`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ inviteToken, nickname: 'Bob', password: 'pw' }),
    });

    // Second join with same token — should fail
    const res = await app.request(`/api/rooms/${roomId}/join`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ inviteToken, nickname: 'Charlie', password: 'pw' }),
    });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/rooms/:id/leave', () => {
  it('leaves a room successfully', async () => {
    const createRes = await app.request('/api/rooms', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Leave Test',
        password: 'pw',
        expirationMinutes: 60,
        nickname: 'Alice',
      }),
    });
    const { roomId, inviteToken } = (await createRes.json()) as {
      roomId: string;
      inviteToken: string;
    };

    // Join to get a session token
    const joinRes = await app.request(`/api/rooms/${roomId}/join`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ inviteToken, nickname: 'Bob', password: 'pw' }),
    });
    const { sessionToken } = (await joinRes.json()) as { sessionToken: string };

    // Leave
    const leaveRes = await app.request(`/api/rooms/${roomId}/leave`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-session-token': sessionToken,
      },
      body: JSON.stringify({}),
    });
    expect(leaveRes.status).toBe(200);
    const body = (await leaveRes.json()) as { ok: boolean };
    expect(body).toEqual({ ok: true });
  });

  it('returns 401 without session token', async () => {
    const res = await app.request('/api/rooms/fake/leave', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/rooms/:id/messages', () => {
  it('returns 401 without valid session token', async () => {
    const res = await app.request('/api/rooms/nonexistent/messages', {
      headers: { 'x-session-token': 'badtoken' },
    });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/rooms/:id/validate-session', () => {
  it('validates a valid session and returns room info', async () => {
    // Create + join to get a valid session
    const createRes = await app.request('/api/rooms', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Validate Test',
        password: 'pw',
        expirationMinutes: 60,
        nickname: 'Alice',
      }),
    });
    const { roomId, inviteToken } = (await createRes.json()) as {
      roomId: string;
      inviteToken: string;
    };

    const joinRes = await app.request(`/api/rooms/${roomId}/join`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ inviteToken, nickname: 'Bob', password: 'pw' }),
    });
    const { sessionToken } = (await joinRes.json()) as { sessionToken: string };

    // Validate the session
    const valRes = await app.request(`/api/rooms/${roomId}/validate-session`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-session-token': sessionToken,
      },
      body: JSON.stringify({}),
    });
    expect(valRes.status).toBe(200);
    const body = (await valRes.json()) as {
      valid: boolean;
      room: { name: string; expiresAt: number; salt: string };
    };
    expect(body).toHaveProperty('valid', true);
    expect(body.room).toHaveProperty('name', 'Validate Test');
    expect(body.room).toHaveProperty('expiresAt');
    expect(body.room).toHaveProperty('salt');
  });

  it('returns valid:false for expired/missing session', async () => {
    const res = await app.request('/api/rooms/fake/validate-session', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-session-token': 'nonexistent_token_123',
      },
      body: JSON.stringify({}),
    });
    const body = (await res.json()) as { valid: boolean };
    expect(body).toHaveProperty('valid', false);
  });
});
