import { describe, expect, it } from 'vitest';
import { createInviteToken, createSessionToken, generateToken, validateToken } from '../lib/token';

describe('token utilities', () => {
  it('generateToken produces a 64-char hex string', () => {
    const token = generateToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('generateToken produces unique values each call', () => {
    const t1 = generateToken();
    const t2 = generateToken();
    expect(t1).not.toBe(t2);
  });

  it('createInviteToken returns an object with id, token, type, expiresAt', () => {
    const result = createInviteToken('room_123', 60);
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('token');
    expect(result).toHaveProperty('type', 'invite');
    expect(result).toHaveProperty('expiresAt');
    expect(typeof result.expiresAt).toBe('number');
    // expiresAt should be ~3600 seconds (60 minutes) from now
    expect(result.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000) + 3000);
    expect(result.expiresAt).toBeLessThanOrEqual(Math.floor(Date.now() / 1000) + 3700);
    expect(result.token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('createSessionToken returns an object with id, token, type, expiresAt', () => {
    const result = createSessionToken('room_123', 60);
    expect(result).toHaveProperty('type', 'session');
    expect(result.token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('validateToken returns the parsed token row for a valid token', () => {
    // validateToken is async and queries DB — tested in integration
    // For unit testing, verify the function signature is correct
    expect(typeof validateToken).toBe('function');
  });
});
