# VanisChat Phase 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold TypeScript monorepo with Turso DB, Drizzle schema, Hono health endpoint, Web Crypto encryption utils, Biome linting, Vitest testing, GitHub Actions CI, and Cloudflare deploy pipeline — zero chat logic.

**Architecture:** Three-package monorepo: `apps/web` (React+Vite frontend → CF Pages), `packages/api` (Hono server → CF Workers), `packages/crypto` (shared Web Crypto utils). All packages share tooling configs. Old Express/Supabase stack stays untouched until Phase 5.

**Tech Stack:** Bun workspaces, Hono, Drizzle ORM + Turso (SQLite), React 19 + Vite + TypeScript strict, Web Crypto API, Biome, Vitest, GitHub Actions, Cloudflare Pages + Workers

**Pre-requisites:** Existing `VanisChat/` repo with old `server.js`, `public/`, `package.json` (Express deps). Accounts: GitHub, Cloudflare, Turso.

---

## File Structure (Target)

```
VanisChat/
├── apps/
│   └── web/                          # React + Vite frontend
│       ├── src/
│       │   ├── main.tsx              # Entry point (ReactDOM.createRoot)
│       │   ├── App.tsx               # Shell: "<h1>VanisChat v2</h1>"
│       │   └── index.css             # @import "tailwindcss"
│       ├── index.html                # Vite HTML template
│       ├── vite.config.ts            # Vite + react plugin
│       ├── tsconfig.json             # extends tooling/ts-base.json
│       ├── biome.json               # extends tooling/biome-config.json
│       └── package.json             # react, react-dom, vite, tailwindcss
├── packages/
│   ├── api/                          # Hono server (deployed to CF Workers)
│   │   ├── src/
│   │   │   ├── index.ts             # Hono app export (for testing + wrangler)
│   │   │   ├── routes/
│   │   │   │   └── health.ts        # GET /health → {status:"ok",timestamp}
│   │   │   ├── db/
│   │   │   │   ├── schema.ts        # Drizzle schema (rooms, messages, room_tokens)
│   │   │   │   └── index.ts         # DB client init (Turso/libsql)
│   │   │   └── __tests__/
│   │   │       └── health.test.ts   # Hono test: GET /health returns 200
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── crypto/                       # Shared Web Crypto utilities
│       ├── src/
│       │   ├── index.ts             # Re-exports all functions
│       │   ├── utils.ts             # arrayBufferToBase64, base64ToArrayBuffer
│       │   ├── derive-key.ts        # PBKDF2 → AES-256-GCM key derivation
│       │   ├── encrypt.ts           # AES-GCM encrypt → {ciphertext, iv}
│       │   ├── decrypt.ts           # AES-GCM decrypt → plaintext
│       │   └── __tests__/
│       │       └── crypto.test.ts   # All crypto function tests
│       ├── tsconfig.json
│       └── package.json
├── tooling/
│   ├── biome-config.json            # Shared linter/formatter config
│   └── ts-base.json                 # Shared TS strict config
├── .github/
│   └── workflows/
│       └── ci.yml                   # lint → typecheck → test → build → deploy
├── wrangler.toml                    # CF Workers deploy config (api package)
├── package.json                     # Root workspace config (updated existing)
├── .gitignore                       # Updated with new entries
├── .env.example                     # Document required env vars
└── docs/
    └── superpowers/
        ├── specs/                   # Already written
        └── plans/                   # This file
```

---

### Task 1: Root Workspace Scaffold

**Files:**

- Modify: `package.json` (add workspaces + new devDeps)
- Modify: `.gitignore` (add new dir patterns)
- Create: `.env.example`
- Create: `tooling/biome-config.json`
- Create: `tooling/ts-base.json`

- [ ] **Step 1: Update root `package.json` to workspace config**

Read existing root `package.json` first:

```json
{
  "name": "vanischat",
  "version": "2.0.0",
  "private": true,
  "workspaces": ["packages/*", "apps/*"],
  "main": "index.js",
  "repository": "https://github.com/ajilenakh/VanisChat.git",
  "author": "Ajilenakh <107887918+ajilenakh@users.noreply.github.com>",
  "license": "MIT",
  "dependencies": {
    "@supabase/supabase-js": "^2.49.8",
    "bcrypt": "^6.0.0",
    "dotenv": "^16.5.0",
    "express": "^5.1.0",
    "express-rate-limit": "^7.5.0",
    "helmet": "^8.1.0",
    "socket.io": "^4.8.1",
    "uuid": "^11.1.0"
  },
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "lint": "biome check .",
    "typecheck": "tsc --noEmit --project apps/web/tsconfig.json && tsc --noEmit --project packages/api/tsconfig.json && tsc --noEmit --project packages/crypto/tsconfig.json",
    "test": "vitest run",
    "build": "bun run --filter @vanischat/web build && bun run --filter @vanischat/api build"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.0",
    "nodemon": "^3.1.10",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0",
    "wrangler": "^4.0.0",
    "drizzle-kit": "^0.30.0",
    "@types/node": "^22.0.0"
  }
}
```

Changes from current:

- Added `"private": true`
- Added `"workspaces": ["packages/*", "apps/*"]`
- Added scripts: lint, typecheck, test, build
- Added devDeps: biome, typescript, vitest, drizzle-kit, @types/node
- Old deps (express, socket.io, etc.) stay — server.js still runs

Run: `cat package.json` to verify current content, then apply edit.

```bash
cat package.json  # verify current state
```

Apply the changes above. **Keep all existing deps — only add new fields.**

- [ ] **Step 2: Update `.gitignore`**

Append to `.gitignore`:

```gitignore
# New monorepo
node_modules/
dist/
.turbo/
.env
*.tsbuildinfo
```

Read current `.gitignore` first, then append. Run:

```bash
cat .gitignore
```

If no `.gitignore` exists, create one. If one exists, append the lines above.

- [ ] **Step 3: Create `.env.example`**

```bash
cat > .env.example << 'EOF'
# Turso Database
TURSO_DB_URL=
TURSO_AUTH_TOKEN=

# Cloudflare
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ACCOUNT_ID=

# Optional: set to "true" to enable file upload in Phase 3
VITE_ENABLE_FILE_UPLOAD=false
EOF
```

- [ ] **Step 4: Create `tooling/biome-config.json`**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "extends": [],
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "style": {
        "noNonNullAssertion": "off",
        "useConst": "error"
      },
      "correctness": {
        "noUnusedVariables": "error"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "always",
      "trailingCommas": "all"
    }
  },
  "files": {
    "ignore": ["node_modules", "dist", ".turbo"]
  }
}
```

- [ ] **Step 5: Create `tooling/ts-base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": false,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 6: Install dependencies and verify**

```bash
bun install
```

Expected output: no errors. Verify:

```bash
bun run --version  # should print bun version
```

---

### Task 2: Crypto Package — Utils (Base64 Helpers)

**Files:**

- Create: `packages/crypto/package.json`
- Create: `packages/crypto/tsconfig.json`
- Create: `packages/crypto/src/utils.ts`
- Create: `packages/crypto/src/__tests__/utils.test.ts`

- [ ] **Step 1: Create `packages/crypto/package.json`**

```json
{
  "name": "@vanischat/crypto",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create `packages/crypto/tsconfig.json`**

```json
{
  "extends": "../../tooling/ts-base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Write the failing test for utils**

Create `packages/crypto/src/__tests__/utils.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { arrayBufferToBase64, base64ToArrayBuffer } from "../utils";

describe("base64 utils", () => {
  it("arrayBufferToBase64 converts an ArrayBuffer to a base64 string", () => {
    const input = new Uint8Array([72, 101, 108, 108, 111]).buffer; // "Hello"
    const result = arrayBufferToBase64(input);
    expect(result).toBe("SGVsbG8=");
  });

  it("base64ToArrayBuffer converts a base64 string back to ArrayBuffer", () => {
    const result = base64ToArrayBuffer("SGVsbG8=");
    const bytes = new Uint8Array(result);
    expect(bytes).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
  });

  it("round-trip produces the same data", () => {
    const original = new Uint8Array([255, 0, 128, 64, 32, 16, 8, 4, 2, 1])
      .buffer;
    const b64 = arrayBufferToBase64(original);
    const decoded = base64ToArrayBuffer(b64);
    expect(new Uint8Array(decoded)).toEqual(new Uint8Array(original));
  });

  it("handles empty buffer", () => {
    const input = new Uint8Array([]).buffer;
    const result = arrayBufferToBase64(input);
    expect(result).toBe("");
    const decoded = base64ToArrayBuffer(result);
    expect(decoded.byteLength).toBe(0);
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

```bash
bun run --filter @vanischat/crypto test
```

Expected output: FAIL — `MODULE_NOT_FOUND` or similar (utils.ts doesn't exist yet).

- [ ] **Step 5: Write the implementation**

Create `packages/crypto/src/utils.ts`:

```typescript
/**
 * Convert an ArrayBuffer to a base64-encoded string.
 * Uses browser/Web Crypto API-compatible approach.
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert a base64-encoded string back to an ArrayBuffer.
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
bun run --filter @vanischat/crypto test
```

Expected output: PASS — all 4 tests pass.

- [ ] **Step 7: Commit**

```bash
git add packages/crypto/ tooling/ .env.example .gitignore
git commit -m "feat: scaffold crypto pkg with base64 utils"
```

---

### Task 3: Crypto Package — Key Derivation + Encrypt/Decrypt

**Files:**

- Create: `packages/crypto/src/derive-key.ts`
- Create: `packages/crypto/src/encrypt.ts`
- Create: `packages/crypto/src/decrypt.ts`
- Create: `packages/crypto/src/index.ts`
- Create: `packages/crypto/src/__tests__/crypto.test.ts`
- Modify: `packages/crypto/package.json` (add `generateSalt` to public API)

- [ ] **Step 1: Write the failing crypto integration test**

Create `packages/crypto/src/__tests__/crypto.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { deriveKey, encrypt, decrypt, generateSalt } from "../index";

describe("crypto full flow", () => {
  it("generateSalt produces 16 random bytes", () => {
    const salt = generateSalt();
    expect(salt).toBeInstanceOf(Uint8Array);
    expect(salt.length).toBe(16);
  });

  it("generateSalt produces different values each call", () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    expect(salt1).not.toEqual(salt2);
  });

  it("encrypt and decrypt round-trip successfully", async () => {
    const salt = generateSalt();
    const key = await deriveKey("my-password", salt);
    const plaintext = "Hello, encrypted world!";
    const { ciphertext, iv } = await encrypt(plaintext, key);
    const decrypted = await decrypt({ ciphertext, iv }, key);
    expect(decrypted).toBe(plaintext);
  });

  it("same password + salt produces same key (deterministic derivation)", async () => {
    const salt = generateSalt();
    const key1 = await deriveKey("password", salt);
    const key2 = await deriveKey("password", salt);
    // Both keys should successfully encrypt and decrypt the same message
    const { ciphertext, iv } = await encrypt("consistent", key1);
    const decrypted = await decrypt({ ciphertext, iv }, key2);
    expect(decrypted).toBe("consistent");
  });

  it("different password produces different ciphertext", async () => {
    const salt = generateSalt();
    const key1 = await deriveKey("alpha", salt);
    const key2 = await deriveKey("beta", salt);
    const { ciphertext: c1 } = await encrypt("secret", key1);
    const { ciphertext: c2 } = await encrypt("secret", key2);
    expect(c1).not.toBe(c2);
  });

  it("decrypt with wrong key throws OperationError", async () => {
    const salt = generateSalt();
    const correctKey = await deriveKey("correct", salt);
    const wrongKey = await deriveKey("wrong", salt);
    const { ciphertext, iv } = await encrypt("protected", correctKey);
    await expect(decrypt({ ciphertext, iv }, wrongKey)).rejects.toThrow();
  });

  it("decrypt with tampered ciphertext throws OperationError", async () => {
    const salt = generateSalt();
    const key = await deriveKey("safe", salt);
    const { ciphertext, iv } = await encrypt("tamper me", key);
    // Corrupt the ciphertext
    const chars = ciphertext.split("");
    chars[0] = chars[0] === "a" ? "b" : "a";
    const tampered = chars.join("");
    await expect(decrypt({ ciphertext: tampered, iv }, key)).rejects.toThrow();
  });

  it("encrypt produces different ciphertext each time (different IV)", async () => {
    const salt = generateSalt();
    const key = await deriveKey("unique", salt);
    const { ciphertext: c1 } = await encrypt("same message", key);
    const { ciphertext: c2 } = await encrypt("same message", key);
    expect(c1).not.toBe(c2); // IV randomization → different output
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun run --filter @vanischat/crypto test
```

Expected output: FAIL — `deriveKey`/`encrypt`/`decrypt`/`generateSalt` not exported.

- [ ] **Step 3: Write `derive-key.ts`**

```typescript
/**
 * Derive an AES-GCM 256-bit key from a password string and salt using PBKDF2.
 * Salt should be 16 random bytes (use generateSalt()).
 * Iterations: 600,000 — strong enough for chat app, fast enough for UX.
 */
export async function deriveKey(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 600_000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
```

- [ ] **Step 4: Write `encrypt.ts`**

```typescript
import { arrayBufferToBase64 } from "./utils";

/**
 * Encrypt a plaintext string using AES-GCM with the given key.
 * Returns base64-encoded ciphertext and IV (both needed for decryption).
 */
export async function encrypt(
  plaintext: string,
  key: CryptoKey,
): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded,
  );
  return {
    ciphertext: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv.buffer),
  };
}
```

- [ ] **Step 5: Write `decrypt.ts`**

```typescript
import { base64ToArrayBuffer } from "./utils";

/**
 * Decrypt an AES-GCM encrypted payload using the given key.
 * Takes the base64 ciphertext and IV returned by encrypt().
 * Throws if the key is wrong or data was tampered with.
 */
export async function decrypt(
  payload: { ciphertext: string; iv: string },
  key: CryptoKey,
): Promise<string> {
  const { ciphertext, iv } = payload;
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToArrayBuffer(iv) },
    key,
    base64ToArrayBuffer(ciphertext),
  );
  return new TextDecoder().decode(decrypted);
}
```

- [ ] **Step 6: Write `generateSalt` + index.ts re-exports**

Create `packages/crypto/src/index.ts`:

```typescript
export { deriveKey } from "./derive-key";
export { encrypt } from "./encrypt";
export { decrypt } from "./decrypt";
export { arrayBufferToBase64, base64ToArrayBuffer } from "./utils";

/**
 * Generate 16 random bytes for use as a PBKDF2 salt.
 * Use a fresh salt per room (stored in room metadata, not secret).
 */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}
```

- [ ] **Step 7: Run tests to verify they all pass**

```bash
bun run --filter @vanischat/crypto test
```

Expected output: PASS — all 11 tests (4 base64 + 7 crypto) pass.

- [ ] **Step 8: Commit**

```bash
git add packages/crypto/src/
git commit -m "feat: implement Web Crypto PBKDF2 + AES-GCM encrypt/decrypt"
```

---

### Task 4: API Package — DB Schema + Health Endpoint

**Files:**

- Create: `packages/api/package.json`
- Create: `packages/api/tsconfig.json`
- Create: `packages/api/src/db/schema.ts`
- Create: `packages/api/src/db/index.ts`
- Create: `packages/api/src/routes/health.ts`
- Create: `packages/api/src/index.ts`
- Create: `packages/api/src/__tests__/health.test.ts`

- [ ] **Step 1: Create `packages/api/package.json`**

```json
{
  "name": "@vanischat/api",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "test": "vitest run",
    "build": "tsup src/index.ts --format esm --outDir dist",
    "dev": "bun run src/index.ts"
  },
  "dependencies": {
    "hono": "^4.7.0",
    "drizzle-orm": "^0.38.0",
    "@libsql/client": "^0.14.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "vitest": "^3.0.0",
    "tsup": "^8.3.0",
    "drizzle-kit": "^0.30.0",
    "@types/node": "^22.0.0"
  }
}
```

- [ ] **Step 2: Create `packages/api/tsconfig.json`**

```json
{
  "extends": "../../tooling/ts-base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node"]
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Write the Drizzle schema**

Create `packages/api/src/db/schema.ts`:

```typescript
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const rooms = sqliteTable(
  "rooms",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    password: text("password").notNull(), // argon2id hash
    salt: text("salt").notNull(), // hex-encoded, for client-side PBKDF2
    expiresAt: integer("expires_at").notNull(), // Unix timestamp seconds
    createdAt: integer("created_at")
      .notNull()
      .default(new Date().getTime() / 1000),
  },
  (table) => ({
    expiresIdx: index("idx_rooms_expires").on(table.expiresAt),
  }),
);

export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    senderName: text("sender_name").notNull(),
    content: text("content").notNull(), // base64 AES-GCM ciphertext
    iv: text("iv").notNull(), // base64 IV
    type: text("type").notNull().default("text"), // 'text' | 'image' | 'file' | 'system'
    fileUrl: text("file_url"),
    fileType: text("file_type"),
    createdAt: integer("created_at")
      .notNull()
      .default(new Date().getTime() / 1000),
  },
  (table) => ({
    roomTimeIdx: index("idx_messages_room_time").on(
      table.roomId,
      table.createdAt,
    ),
  }),
);

export const roomTokens = sqliteTable(
  "room_tokens",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // 'invite' | 'session'
    expiresAt: integer("expires_at").notNull(),
    usesLeft: integer("uses_left").default(1),
    createdAt: integer("created_at")
      .notNull()
      .default(new Date().getTime() / 1000),
  },
  (table) => ({
    tokenRoomIdx: index("idx_tokens_room").on(table.roomId, table.type),
  }),
);
```

- [ ] **Step 4: Create `packages/api/src/db/index.ts`**

```typescript
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

/**
 * Initialize a Turso/libSQL database client.
 * Requires TURSO_DB_URL and TURSO_AUTH_TOKEN env vars.
 *
 * Usage:
 *   const db = getDb();
 *   const result = await db.select().from(schema.rooms).all();
 */
export function getDb() {
  const url = process.env.TURSO_DB_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error("TURSO_DB_URL environment variable is required");
  }

  const client = createClient({
    url,
    authToken,
  });

  return drizzle(client, { schema });
}

export { schema };
```

- [ ] **Step 5: Write the health route (TDD — test first)**

Create `packages/api/src/__tests__/health.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { app } from "../index";

describe("GET /health", () => {
  it("returns 200 with status ok and timestamp", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty("status", "ok");
    expect(body).toHaveProperty("timestamp");

    // timestamp should be a number close to current time
    const now = Math.floor(Date.now() / 1000);
    expect(body.timestamp).toBeGreaterThan(now - 10);
    expect(body.timestamp).toBeLessThanOrEqual(now + 1);
  });

  it("returns 404 for unknown routes", async () => {
    const res = await app.request("/nonexistent");
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 6: Run the test — expect FAIL**

```bash
bun run --filter @vanischat/api test
```

Expected output: FAIL — `app` not exported from `../index.ts` (index.ts doesn't exist yet).

- [ ] **Step 7: Create health route + app entry point**

Create `packages/api/src/routes/health.ts`:

```typescript
import { Hono } from "hono";

const healthRoutes = new Hono();

healthRoutes.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: Math.floor(Date.now() / 1000),
  });
});

export { healthRoutes };
```

Create `packages/api/src/index.ts`:

```typescript
import { Hono } from "hono";
import { healthRoutes } from "./routes/health";

const app = new Hono();

// Mount routes
app.route("/", healthRoutes);

export { app };
```

The app only exports the Hono `app` object (a standard `fetch` handler). Cloudflare Workers will call this directly. For local dev, use `wrangler dev` or `bunx tsx packages/api/src/index.ts` with a simple serve wrapper — but **not in this file** (to keep it Worker-compatible).

For local testing without wrangler, create a dev entry file (`packages/api/src/dev.ts`):

```typescript
import { app } from "./index";

const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;
console.log(`Dev server on http://localhost:${port}`);

Bun.serve({
  fetch: app.fetch,
  port,
});
```

Then update `packages/api/package.json` scripts:

```json
"dev": "bun run src/dev.ts",
"dev:wrangler": "wrangler dev src/index.ts"
```

- [ ] **Step 8: Run tests — expect PASS**

```bash
bun run --filter @vanischat/api test
```

Expected output: PASS — both health tests pass.

- [ ] **Step 9: Commit**

```bash
git add packages/api/
git commit -m "feat: scaffold API pkg with Drizzle schema and health endpoint"
```

---

### Task 5: Web App Scaffold (React Shell + Vite + Tailwind)

**Files:**

- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/index.html`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`
- Create: `apps/web/src/index.css`
- Create: `apps/web/biome.json`

- [ ] **Step 1: Create `apps/web/package.json`**

```json
{
  "name": "@vanischat/web",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0"
  }
}
```

- [ ] **Step 2: Create `apps/web/tsconfig.json`**

```json
{
  "extends": "../../tooling/ts-base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "jsx": "react-jsx",
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `apps/web/vite.config.ts`**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist",
  },
});
```

- [ ] **Step 4: Create `apps/web/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>VanisChat</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create `apps/web/src/main.tsx`**

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 6: Create `apps/web/src/App.tsx`**

```typescript
function App() {
  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>VanisChat v2</h1>
      <p style={{ color: '#666', marginTop: '0.5rem' }}>
        Foundation phase — chat coming in Phase 2
      </p>
    </main>
  );
}

export default App;
```

- [ ] **Step 7: Create `apps/web/src/index.css`**

```css
@import "tailwindcss";

/* Base reset — minimal for Phase 1 */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  min-height: 100vh;
  background: #f8fafc;
  color: #0f172a;
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 8: Create `apps/web/biome.json`**

```json
{
  "extends": ["../../tooling/biome-config.json"]
}
```

- [ ] **Step 9: Build the web app to verify**

```bash
bun run --filter @vanischat/web build
```

Expected output: `dist/` directory created with `index.html` and hashed JS/CSS files. No errors.

- [ ] **Step 10: Commit**

```bash
git add apps/web/
git commit -m "feat: scaffold web app with React + Vite + Tailwind v4"
```

---

### Task 6: CI Pipeline

**Files:**

- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  quality:
    name: Lint, Typecheck, Test, Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Lint
        run: bun run lint

      - name: Type check
        run: bun run typecheck

      - name: Test
        run: bun run test

      - name: Build
        run: bun run build

  deploy:
    name: Deploy to Cloudflare
    if: github.ref == 'refs/heads/main'
    needs: [quality]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Build web
        run: bun run --filter @vanischat/web build

      - name: Build api
        run: bun run --filter @vanischat/api build

      - name: Deploy web to Cloudflare Pages
        run: npx wrangler pages deploy apps/web/dist --project-name vanischat
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

      - name: Deploy api to Cloudflare Workers
        run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

- [ ] **Step 2: Verify biome lint config is accessible**

```bash
bun run lint
```

Expected output: clean (no lint errors). The root biome.json doesn't exist yet — need to create it.

Wait — the root `biome.json` is missing. The lint script runs `biome check .` at root, so we need a root biome config that extends the shared one.

Create root `biome.json`:

```json
{
  "extends": ["./tooling/biome-config.json"]
}
```

Then run lint again:

```bash
bun run lint
```

Expected output: no lint errors (or only warnings about unused old files, which is OK).

- [ ] **Step 3: Run a full typecheck to verify**

```bash
bun run typecheck
```

Expected: PASS — no type errors across all 3 packages.

- [ ] **Step 4: Run full test suite**

```bash
bun run test
```

Expected output: PASS — crypto tests (11) + health tests (2) = 13 tests passing.

- [ ] **Step 5: Run full build**

```bash
bun run build
```

Expected output: `apps/web/dist/` + `packages/api/dist/` created successfully.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/ci.yml biome.json
git commit -m "ci: add GitHub Actions pipeline and root biome config"
```

---

### Task 7: External Services + Deploy Configuration

**Files:**

- Create: `wrangler.toml` (Cloudflare Workers config)
- Modify: `.gitignore` (add wrangler-generated files)

- [ ] **Step 1: Create `wrangler.toml`**

```toml
name = "vanischat-api"
main = "packages/api/src/index.ts"
compatibility_date = "2026-05-01"

[env.production]
vars = { NODE_ENV = "production" }

# Turso DB — set via wrangler secret
# TURSO_DB_URL and TURSO_AUTH_TOKEN must be set:
#   npx wrangler secret put TURSO_DB_URL
#   npx wrangler secret put TURSO_AUTH_TOKEN
```

- [ ] **Step 2: Update `.gitignore` for wrangler**

Append to `.gitignore`:

```gitignore
# Cloudflare
.wrangler/
```

- [ ] **Step 3: Provision Turso database**

Requires Turso CLI installed:

```bash
# Install Turso CLI if not already installed
curl -sSfL https://get.tur.so/install.sh | bash

# Login
turso auth login

# Create database
turso db create vanischat

# Get database URL
turso db show vanischat --url

# Generate auth token
turso db tokens create vanischat
```

Expected output: database URL and auth token printed. Save these for step 4.

- [ ] **Step 4: Set up Cloudflare Workers secrets**

```bash
# Login to Cloudflare
npx wrangler login

# Set Turso secrets
npx wrangler secret put TURSO_DB_URL
# Paste the URL from step 3

npx wrangler secret put TURSO_AUTH_TOKEN
# Paste the token from step 3
```

Expected output: Each `secret put` confirms "✨ Success! Uploaded secret TURSO_DB_URL"

- [ ] **Step 5: Run Drizzle migration to create tables**

Create `packages/api/drizzle.config.ts`:

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.TURSO_DB_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
```

Add a `db:push` script to `packages/api/package.json`:

```json
"db:push": "drizzle-kit push"
```

Run it:

```bash
TURSO_DB_URL=<url> TURSO_AUTH_TOKEN=<token> bun run --filter @vanischat/api db:push
```

Expected output: "✓ Generated migration" + "✓ Applied migration to database" — 3 tables created (rooms, messages, room_tokens).

Verify by querying Turso CLI:

```bash
turso db shell vanischat ".tables"
```

Expected: `rooms`, `messages`, `room_tokens` listed.

- [ ] **Step 6: Set up Cloudflare Pages for the web app**

```bash
# Create Pages project (one-time setup)
npx wrangler pages project create vanischat --production-branch main
```

Expected output: "✨ Successfully created the project 'vanischat'"

- [ ] **Step 7: Deploy web app to Pages to verify**

```bash
bun run --filter @vanischat/web build
npx wrangler pages deploy apps/web/dist --project-name vanischat
```

Expected output: "✨ Success! Uploaded ..." with a `*.pages.dev` URL.

Visit the URL in a browser — should show "VanisChat v2" heading.

- [ ] **Step 8: Deploy API to Workers to verify health endpoint**

```bash
npx wrangler deploy
```

Expected output: "✨ Success! Published at https://vanischat-api.<subdomain>.workers.dev"

Verify:

```bash
curl https://vanischat-api.<subdomain>.workers.dev/health
```

Expected response: `{"status":"ok","timestamp":<number>}`

- [ ] **Step 9: Commit configuration files**

```bash
git add wrangler.toml packages/api/drizzle.config.ts
git add .gitignore
git add packages/api/package.json  # if db:push script was added
git commit -m "chore: configure Turso DB, Cloudflare deploy, and wrangler"
```

---

### Task 8: Final Verification — Full Pipeline Smoke Test

- [ ] **Step 1: Run all checks locally one final time**

```bash
bun install  # ensure clean lockfile
bun run lint
bun run typecheck
bun run test
bun run build
```

All 4 commands must pass without errors.

- [ ] **Step 2: Verify git status is clean**

```bash
git status
```

Expected: only untracked `docs/superpowers/specs/` and `docs/superpowers/plans/` files (or they're already committed). No modified unstaged files.

- [ ] **Step 3: Push to main and verify CI run on GitHub**

```bash
git push origin main
```

Go to GitHub → Actions tab → verify CI workflow runs green (lint, typecheck, test, build, deploy).

- [ ] **Step 4: Final commit — all Phase 1 work**

```bash
git add -A
git commit -m "feat: complete Phase 1 foundation scaffold"
git push origin main
```

---

## Spec Coverage Check

| Spec Requirement                                             | Task                                              |
| ------------------------------------------------------------ | ------------------------------------------------- |
| Monorepo directory structure                                 | Task 1 (root package.json workspaces)             |
| Vite + React 19 + TS strict frontend                         | Task 5                                            |
| Hono server skeleton with GET /health                        | Task 4                                            |
| Drizzle schema (rooms, messages, room_tokens)                | Task 4 (schema.ts)                                |
| Turso database provisioned                                   | Task 7                                            |
| Biome linter + formatter                                     | Task 1 (shared config) + Task 6 (root biome.json) |
| Vitest test setup with smoke test                            | Task 2-4                                          |
| Web Crypto API encryption utils                              | Task 2-3                                          |
| GitHub Actions CI (lint → typecheck → test → build → deploy) | Task 6                                            |
| Cloudflare Pages + Workers deploy config                     | Task 7                                            |
| All config committed and CI green                            | Task 8                                            |
| .env.example with documented secrets                         | Task 1                                            |
