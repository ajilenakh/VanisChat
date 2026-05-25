import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const rooms = sqliteTable(
  'rooms',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    password: text('password').notNull(), // argon2id hash
    salt: text('salt').notNull(), // hex-encoded, for client-side PBKDF2
    expiresAt: integer('expires_at').notNull(), // Unix timestamp seconds
    createdAt: integer('created_at')
      .notNull()
      .$defaultFn(() => Math.floor(Date.now() / 1000)),
  },
  (table) => ({
    expiresIdx: index('idx_rooms_expires').on(table.expiresAt),
  }),
);

export const messages = sqliteTable(
  'messages',
  {
    id: text('id').primaryKey(),
    roomId: text('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    senderName: text('sender_name').notNull(),
    content: text('content').notNull(), // base64 AES-GCM ciphertext
    iv: text('iv').notNull(), // base64 IV
    type: text('type').notNull().default('text').$type<'text' | 'image' | 'system'>(),
    // fileUrl: text('file_url'),     // Phase 3: file upload
    // fileType: text('file_type'),   // Phase 3: file upload
    createdAt: integer('created_at')
      .notNull()
      .$defaultFn(() => Math.floor(Date.now() / 1000)),
  },
  (table) => ({
    roomTimeIdx: index('idx_messages_room_time').on(table.roomId, table.createdAt),
  }),
);

export const roomTokens = sqliteTable(
  'room_tokens',
  {
    id: text('id').primaryKey(),
    roomId: text('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    type: text('type').notNull().$type<'invite' | 'session'>(),
    expiresAt: integer('expires_at').notNull(),
    usesLeft: integer('uses_left').default(1),
    nickname: text('nickname'),
    createdAt: integer('created_at')
      .notNull()
      .$defaultFn(() => Math.floor(Date.now() / 1000)),
  },
  (table) => ({
    tokenRoomIdx: index('idx_tokens_room').on(table.roomId, table.type),
  }),
);
