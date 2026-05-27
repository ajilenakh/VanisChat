/**
 * Test setup: shim Bun globals + configure local SQLite test DB.
 *
 * The API uses Bun.password for argon2id hashing in production.
 * Tests use a local file-based SQLite to avoid depending on remote Turso.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@libsql/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const g = globalThis as Record<string, unknown>;
if (typeof g.Bun === 'undefined') {
  g.Bun = {
    password: {
      hash: async (password: string, _algorithm?: string) => `shimmed:${password}`,
      hashSync: (password: string, _algorithm?: string) => `shimmed:${password}`,
      verify: async (password: string, hash: string) => hash === `shimmed:${password}`,
      verifySync: (password: string, hash: string) => hash === `shimmed:${password}`,
    },
  };
}

// Set up local file-based SQLite database for tests.
// File-based so multiple getDb() connections see the same data.
const TEST_DB_PATH = path.resolve(__dirname, '../../../.test-data/test.db');

async function setupDatabase() {
  fs.mkdirSync(path.dirname(TEST_DB_PATH), { recursive: true });

  process.env.TURSO_DB_URL = `file:${TEST_DB_PATH}`;
  process.env.TURSO_AUTH_TOKEN = '';

  const client = createClient({ url: process.env.TURSO_DB_URL });

  await client.batch([
    `CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      password TEXT NOT NULL,
      salt TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      sender_name TEXT NOT NULL,
      content TEXT NOT NULL,
      iv TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'text',
      file_url TEXT,
      file_type TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS room_tokens (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      uses_left INTEGER DEFAULT 1,
      nickname TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    'CREATE INDEX IF NOT EXISTS idx_rooms_expires ON rooms(expires_at)',
    'CREATE INDEX IF NOT EXISTS idx_messages_room_time ON messages(room_id, created_at)',
    'CREATE INDEX IF NOT EXISTS idx_tokens_room ON room_tokens(room_id, type)',
  ]);

  client.close();
}

if (!process.env.TURSO_DB_URL) {
  await setupDatabase();
}
