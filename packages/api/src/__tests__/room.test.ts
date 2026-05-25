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
      body: JSON.stringify({ inviteToken, nickname: 'Bob' }),
    });

    // Second join with same token — should fail
    const res = await app.request(`/api/rooms/${roomId}/join`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ inviteToken, nickname: 'Charlie' }),
    });
    expect(res.status).toBe(401);
  });
});
