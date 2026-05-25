import { z } from 'zod';

export const createRoomSchema = z.object({
  name: z.string().min(1).max(100),
  password: z.string().min(1).max(256),
  expirationMinutes: z.number().int().min(1).max(1440).default(60),
  nickname: z.string().min(1).max(50),
});

export const joinRoomSchema = z.object({
  inviteToken: z.string().length(64),
  nickname: z.string().min(1).max(50),
});

export const leaveRoomSchema = z.object({
  // empty body — session token is in header
});

export const messagesQuerySchema = z.object({
  before: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? Number.parseInt(v, 10) : 50))
    .pipe(z.number().int().min(1).max(100)),
});

export const validateSessionSchema = z.object({
  // empty body — session token in header
});
