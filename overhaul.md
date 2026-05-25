# VanisChat — Overhaul System Design ($0 Budget)

> **Goal**: Complete rewrite/overhaul of VanisChat with **zero monetary cost**.  
> **Constraint**: Every tool, service, and dependency must have a **generous free tier** or be **fully open-source / self-hostable**.  
> **Current Stack Problems**: Vanilla JS spaghetti, 0-byte crypto library, broken HTML, no tests, no types, no CI, single-file server.

---

## 1. Recommended Target Stack ($0)

| Layer                  | Choice                                                                       | Why                                                                                              | Cost |
| ---------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---- |
| **Runtime**            | Node.js (LTS) or Bun                                                         | Both free. Bun faster, built-in test runner, TS support. Node safer for ecosystem.               | $0   |
| **Backend Framework**  | Hono                                                                         | Lightweight, edge-ready, works on Cloudflare Workers, Node, Bun. Free.                           | $0   |
| **Real-time**          | Supabase Realtime (free tier) or WebSockets via Hono                         | Drop Socket.IO dependency — simplify. Or keep WebSocket via Hono WS adapter.                     | $0   |
| **Database**           | SQLite via Turso (free tier) **or** Supabase free tier **or** Neon free tier | Multiple free options. Turso: 9GB, 1B reqs/mo. Supabase: 500MB. Neon: 0.5GB.                     | $0   |
| **ORM**                | Drizzle ORM                                                                  | Free, type-safe, works with SQLite/Postgres/MySQL. Lighter than Prisma.                          | $0   |
| **Frontend Framework** | React + Vite + TypeScript                                                    | Industry standard, free. Vite is fast, no bundler cost.                                          | $0   |
| **Routing (FE)**       | React Router (free) or wouter (lighter)                                      | Free, open source.                                                                               | $0   |
| **Styling**            | Tailwind CSS v4                                                              | Free. Utility-first. No runtime cost (purged in build).                                          | $0   |
| **Encryption**         | Web Crypto API (SubtleCrypto)                                                | Built into every browser. **Zero dependencies.** No crypto-js needed. PBKDF2 for key derivation. | $0   |
| **Validation**         | Zod                                                                          | Free, type-safe schema validation for both client & server.                                      | $0   |
| **Testing**            | Vitest + Playwright                                                          | Vitest: free, Vite-native. Playwright: free, cross-browser E2E.                                  | $0   |
| **Linting**            | Biome or ESLint + Prettier                                                   | Biome: free, Rust-based, fast (linter + formatter in one).                                       | $0   |
| **Hosting**            | Cloudflare Pages (frontend) + Cloudflare Workers (backend)                   | Free tier: unlimited sites, 100k reqs/day on Workers.                                            | $0   |
| **CI/CD**              | GitHub Actions                                                               | Free: 2000 min/month for public repos.                                                           | $0   |
| **Monitoring**         | Self-hosted or Better Stack free tier                                        | Better Stack: 50k log lines/mo free. Or just `pino` + file logging.                              | $0   |

---

## 2. Architecture Diagram (Target)

```
┌──────────────────────────────────────────────────────────────────┐
│                    BROWSER (React + Vite SPA)                      │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐     │
│  │                    React App                               │     │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────────────────┐  │     │
│  │  │ Lobby    │  │ ChatRoom │  │  Web Crypto API         │  │     │
│  │  │ (create/ │  │ (messages│  │  ├─ PBKDF2 key deriv    │  │     │
│  │  │  join)   │  │  display)│  │  ├─ AES-GCM encrypt     │  │     │
│  │  └──────────┘  └──────────┘  │  └─ decrypt             │  │     │
│  │  ┌───────────────────────────┘                         │  │     │
│  │  │ Tailwind CSS + Radix UI (or shadcn)                 │  │     │
│  │  └─────────────────────────────────────────────────────┘  │     │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐     │
│  │  Supabase Realtime (presence) / REST (data)              │     │
│  └──────────────────────────────────────────────────────────┘     │
└──────────────────────────┬───────────────────────────────────────┘
                           │ HTTP + WebSocket
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│          CLOUDFLARE WORKERS (or Node.js Server)                    │
│                                                                    │
│  ┌────────────┐  ┌──────────────┐  ┌───────────────────────────┐ │
│  │  Hono App  │  │  Drizzle ORM │  │  Zod Validation           │ │
│  │  ├─ POST   │  │  + Turso DB  │  │  ├─ schemas for all input │ │
│  │  │ /rooms  │  │  (SQLite)    │  │  ├─ type inference        │ │
│  │  ├─ POST   │  │  or          │  │  └─ server-side guard     │ │
│  │  │ /rooms/ │  │  Supabase    │  │                           │ │
│  │  │ :id/join│  │  (Postgres)  │  │  ┌───────────────────────┐│ │
│  │  ├─ WS     │  │              │  │  │  Web Crypto API       ││ │
│  │  │ /chat   │  │              │  │  │  (key exchange only   ││ │
│  │  └─────────┘  └──────────────┘  │  │   if doing E2EE)      ││ │
│  │                                  │  └───────────────────────┘│ │
│  │  ┌────────────────────────────┐  │                           │ │
│  │  │  GitHub Actions CI/CD      │  │                           │ │
│  │  │  ├─ lint (Biome)           │  │                           │ │
│  │  │  ├─ test (Vitest)          │  │                           │ │
│  │  │  ├─ type-check (tsc)       │  │                           │ │
│  │  │  └─ deploy (CF Pages/Work) │  │                           │ │
│  │  └────────────────────────────┘  │                           │ │
│  └──────────────────────────────────┘                           │ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Database Design (Target)

### Option A: Turso (SQLite Edge) — $0

```
Free tier: 9GB storage, 1 billion requests/month, 3 databases
```

```sql
-- No UUID extension needed — SQLite handles TEXT PKs fine

CREATE TABLE rooms (
    id          TEXT PRIMARY KEY,           -- nanoid or uuid v4
    name        TEXT NOT NULL,
    password    TEXT NOT NULL,              -- argon2id hash (server-side)
    expires_at  INTEGER NOT NULL,           -- Unix timestamp (seconds)
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE messages (
    id              TEXT PRIMARY KEY,
    room_id         TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    sender_id       TEXT NOT NULL,          -- ephemeral session token, not a real user
    sender_name     TEXT NOT NULL,
    content         TEXT NOT NULL,          -- encrypted payload (base64)
    type            TEXT NOT NULL DEFAULT 'text',  -- text | image | file | system
    file_url        TEXT,
    file_type       TEXT,
    created_at      INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_messages_room ON messages(room_id, created_at);
CREATE INDEX idx_rooms_expires ON rooms(expires_at);
```

### Option B: Supabase (Postgres) — $0

```
Free tier: 500MB database, 2GB bandwidth, 50,000 monthly active users
```

Same schema as current `schema.sql` but:

- Remove RLS policies that allow public access (better: use Row-Level Security per room via ephemeral tokens)
- Add an `ephemeral_tokens` table for session-based room access
- Use Supabase Realtime native for presence

### Option C: Neon (Serverless Postgres) — $0

```
Free tier: 0.5GB DB, 100h compute/month, branch-based DB
```

Similar to Supabase but without the managed auth/realtime features. You'd need your own WebSocket layer.

### Recommended: Turso + Drizzle

```
Why:
  - SQLite = zero ops, no connection pool needed
  - Turso = edge-distributed reads (low latency globally)
  - Drizzle = type-safe, lightweight, SQL-like API
  - No Supabase vendor lock-in
  - Free tier is extremely generous
```

---

## 4. Encryption Design (Target)

### Current Problem

- Room password = raw AES key (no derivation)
- crypto-js.min.js = 0 bytes (app broken)
- Password shared in URL query params
- No E2EE — server could read messages

### Target: Hybrid E2EE with Web Crypto API

```
Key Exchange Flow:
  1. Room Creator generates:
     - AES-GCM 256-bit key (for message encryption)
     - RSA-OAEP keypair (for key exchange)
  2. Public key embedded in invite link/token
  3. Joiner generates their own RSA keypair
  4. Joiner encrypts their AES session key with creator's public key
  5. Server relays encrypted keys (cannot read them)

Simpler Option (no E2EE, still AES):
  1. Room password → PBKDF2 with salt → 256-bit AES key
  2. Encrypt/decrypt messages with AES-GCM
  3. Salt stored in room metadata (not secret)
  4. Password still shared via invite link (but can improve delivery)
```

```js
// Web Crypto API — Zero dependencies, free, native
// Key derivation (instead of raw password):
async function deriveKey(password, salt) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 600000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

// Encrypt:
async function encrypt(plaintext, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded,
  );
  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv),
  };
}

// Decrypt:
async function decrypt(ciphertext, key, iv) {
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToArrayBuffer(iv) },
    key,
    base64ToArrayBuffer(ciphertext),
  );
  return new TextDecoder().decode(decrypted);
}
```

**Why this matters**: Web Crypto API is built into every modern browser. No crypto-js needed. No download. No 0-byte files. PBKDF2 with 600,000 iterations makes brute-forcing infeasible even if password is weak.

---

## 5. Frontend Architecture (Target)

### Component Tree

```
App
├── ThemeProvider (dark/light, system preference detection)
├── LobbyPage
│   ├── Tabs (create / join)
│   ├── CreateRoomForm
│   │   ├── NicknameInput
│   │   ├── RoomNameInput
│   │   ├── PasswordInput
│   │   └── ExpirationSlider (1-1440 min)
│   └── JoinRoomForm
│       ├── NicknameInput
│       ├── RoomIdInput
│       └── PasswordInput
├── ChatPage
│   ├── ChatHeader
│   │   ├── RoomTitle
│   │   ├── TimerDisplay
│   │   ├── InviteLinkButton (copy to clipboard)
│   │   ├── OnlineCount
│   │   └── LeaveButton
│   ├── MessageList
│   │   └── Message[]
│   │       ├── SystemNotification
│   │       ├── TextMessage (decrypted client-side)
│   │       └── MediaMessage (image/file)
│   └── MessageInput
│       ├── TextInput
│       └── SendButton
```

### Routing (React Router or wouter)

```
/           → LobbyPage
/room/:id   → ChatPage (with invite params?pw=...)
```

### State Management

```
No Redux needed. Just:
- React Context for: currentRoom, theme
- useReducer or useState per-page
- Supabase Realtime subscription as React hook (useSubscription)
- Custom hooks: useRoom(), useMessages(), usePresence()
```

### Tech Choices

```
Framework:     React 19 + TypeScript (Vite)
Styling:       Tailwind CSS v4 (zero-cost, purged in build)
Icons:         Lucide (free, tree-shakeable SVG icons)
Components:    shadcn/ui (copy-paste, no cost) or Radix UI primitives
Clipboard:     navigator.clipboard.writeText() (modern API, no library)
Encryption:    Web Crypto API (built-in)
HTTP client:   fetch (built-in) or ky (lightweight wrapper)
Date handling: Temporal API (when stable) or date-fns (free, tree-shakeable)
```

---

## 6. Backend Architecture (Target)

### Route Design (Hono on Cloudflare Workers or Node.js)

```
POST   /api/rooms              → createRoom(body: {name, password, expirationMinutes})
POST   /api/rooms/:id/join     → joinRoom(body: {password, nickname}) → {token, messages}
POST   /api/rooms/:id/leave    → leaveRoom(body: {token})
GET    /api/rooms/:id/messages → getMessages(header: {token}) — paginated
WS     /ws/room/:id            → real-time: presence, typing, new messages
```

### Why Hono over Express?

| Factor            | Express 5         | Hono                                     |
| ----------------- | ----------------- | ---------------------------------------- |
| Size              | Heavy (many deps) | **~14KB** (tiny)                         |
| Edge support      | No                | **Cloudflare Workers, Deno, Bun, Node**  |
| TypeScript        | Manual            | **First-class, infer types from schema** |
| WebSocket         | Separate libs     | **Built-in WS adapter**                  |
| Middleware        | Middleware chain  | **Same but lighter**                     |
| Validation Plugin | No                | **Zod validator middleware built-in**    |
| Cost              | Free              | **Free**                                 |

### Server Architecture

```
src/
├── index.ts              # Hono app bootstrap
├── db/
│   ├── schema.ts         # Drizzle schema definitions
│   ├── index.ts          # DB client (Turso/SQLite/Supabase)
│   └── migrations/       # Drizzle Kit generated SQL
├── routes/
│   ├── rooms.ts          # POST /rooms, GET /rooms/:id
│   ├── messages.ts       # GET /messages, WebSocket handler
│   └── health.ts         # GET /health
├── services/
│   ├── room.service.ts   # Room business logic
│   ├── message.service.ts # Message business logic
│   └── crypto.service.ts # Server-side hashing (argon2)
├── middleware/
│   ├── auth.ts           # Token verification
│   ├── rate-limit.ts     # Per-endpoint rate limiting
│   └── error-handler.ts  # Structured error responses
├── lib/
│   ├── token.ts          # Ephemeral session token generation
│   ├── validation.ts     # Zod schemas
│   └── types.ts          # Shared types
└── ws/
    └── room.ts           # WebSocket handler for room presence
```

---

## 7. Invite Link System (Target)

### Current (Broken)

```
?room=<uuid>&pw=<plaintext-password>
```

### Target: Token-based

```
?room=<room-id>&token=<ephemeral-one-time-token>
```

**Flow**:

1. Room creator gets a **one-time use token** (random 32-byte hex, generated server-side)
2. Token is **not the password** — it's a separate access credential
3. Token is valid for 24h or single use (whichever comes first)
4. On join: server verifies token, issues a **session token** for the room
5. Password never touches the URL
6. Session token stored in `sessionStorage` (cleared on tab close)

```sql
-- New table for tokens
CREATE TABLE room_tokens (
    id        TEXT PRIMARY KEY,
    room_id   TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    type      TEXT NOT NULL,           -- 'invite' | 'session'
    expires_at INTEGER NOT NULL,
    uses_left INTEGER DEFAULT 1,       -- for invite tokens
    created_at INTEGER DEFAULT (unixepoch())
);
```

**$0 implementation**: Use `crypto.randomBytes(32).toString('hex')` (Node.js) or `crypto.getRandomValues` (Web Crypto on Workers) for token generation. No paid auth service needed.

---

## 8. Deployment Architecture ($0)

```
┌──────────────────────────────────────────────────────────┐
│ GITHUB (free)                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Repository: ajilenakh/VanisChat                       │ │
│  │                                                       │ │
│  │ GitHub Actions (free: 2000 min/month):                │ │
│  │  ├─ On push to main:                                  │ │
│  │  │  ├─ bun install                                    │ │
│  │  │  ├─ bun run lint       (Biome)                     │ │
│  │  │  ├─ bun run typecheck  (tsc --noEmit)              │ │
│  │  │  ├─ bun run test       (Vitest)                    │ │
│  │  │  ├─ bun run build      (Vite build)                │ │
│  │  │  └─ Deploy to CF Pages + Workers                   │ │
│  │  └─ On PR: run lint + typecheck + test (skips deploy) │ │
│  └──────────────────────────────────────────────────────┘ │
└─────────────────────────┬────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│ CLOUDFLARE (free tier)                                    │
│                                                           │
│  ┌────────────────────┐  ┌────────────────────────────┐  │
│  │ Cloudflare Pages   │  │ Cloudflare Workers          │  │
│  │ (unlimited sites)  │  │ (100k requests/day)         │  │
│  │                    │  │                              │  │
│  │ Serves:            │  │ Serves:                     │  │
│  │  - index.html      │  │  - Hono API routes          │  │
│  │  - assets (.js,    │  │  - WebSocket handler        │  │
│  │    .css, .svg)      │  │  - Token verification      │  │
│  │  - static fonts    │  │                              │  │
│  │                    │  │ Connects to:                 │  │
│  │ Domain:            │  │  - Turso DB (SQLite)        │  │
│  │  vanischat.pages.dev │  │  - or Supabase (Postgres)   │  │
│  └────────────────────┘  └────────────────────────────┘  │
│                                                           │
│  ┌────────────────────────────────────────────────────┐   │
│  │ TURSO DB (free: 9GB, 1B reqs/mo, 3 databases)      │   │
│  │                                                    │   │
│  │  vanischat-rooms    → rooms table                   │   │
│  │  vanischat-messages → messages table                │   │
│  │  vanischat-tokens   → room_tokens table             │   │
│  └────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### Alternative Free Hosting Options

| Platform                       | Free Tier                              | Best For                     | Limitation                               |
| ------------------------------ | -------------------------------------- | ---------------------------- | ---------------------------------------- |
| **Cloudflare Pages + Workers** | Unlimited sites, 100k reqs/day         | Full stack, edge performance | Workers CPU limit (10ms free, 50ms paid) |
| **Vercel**                     | 100GB bandwidth, 6000 build min        | Frontend + serverless fns    | 60s execution limit on free              |
| **Railway**                    | $5 credit/month (≈500 hrs)             | Full Node.js backend         | Credit runs out                          |
| **Fly.io**                     | 3 VMs, 256MB each, 160GB egress        | Stateful backends            | Requires credit card                     |
| **Render**                     | 750 hrs/month, sleeps after 15min      | Simple backends              | Cold starts after sleep                  |
| **Netlify**                    | 100GB bandwidth, 300 build min         | Static frontend + functions  | 10s function timeout                     |
| **Oracle Cloud**               | 4 ARM cores, 24GB RAM **free forever** | Heavy backends               | Complex setup                            |

### Recommendation: Cloudflare Pages + Workers

```
Reasoning:
  - Most generous free tier for chat app use case
  - Pages serves static assets at edge (low latency)
  - Workers handle API + WebSocket at edge
  - Turso integrates natively with Workers via @libsql/client
  - No cold starts (Workers are isolate-based)
  - Unlimited bandwidth on Pages
```

---

## 9. Testing Strategy ($0)

| Layer           | Tool                           | Cost | What to Test                                                                 |
| --------------- | ------------------------------ | ---- | ---------------------------------------------------------------------------- |
| **Unit**        | Vitest                         | $0   | Services, validation schemas, crypto utils, token generation                 |
| **Component**   | Vitest + React Testing Library | $0   | Each React component in isolation                                            |
| **Integration** | Vitest + MSW                   | $0   | API routes with mocked DB                                                    |
| **E2E**         | Playwright                     | $0   | Full user flows: create room, share invite, join, send messages, room expiry |
| **Lint**        | Biome                          | $0   | Code style, import organization, no unused vars                              |
| **Type Check**  | tsc --noEmit                   | $0   | Type safety across the entire codebase                                       |

### Playwright E2E Test Example (Free)

```ts
// tests/e2e/chat.spec.ts
test("full chat flow", async ({ page, browser }) => {
  const user1 = await browser.newPage();
  const user2 = await browser.newPage();

  // User 1 creates a room
  await user1.goto("/");
  await user1.fill('[data-testid="nickname"]', "Alice");
  await user1.fill('[data-testid="room-name"]', "Test Room");
  await user1.fill('[data-testid="password"]', "secret");
  await user1.click('[data-testid="create-room"]');

  // User 1 sees chat UI
  await expect(user1.locator('[data-testid="chat-container"]')).toBeVisible();

  // Copy invite link
  await user1.click('[data-testid="copy-invite"]');
  const inviteLink = await user1.evaluate(() => navigator.clipboard.readText());

  // User 2 joins via invite link
  await user2.goto(inviteLink);
  await user2.fill('[data-testid="nickname"]', "Bob");
  await user2.click('[data-testid="join-room"]');

  // Both users see each other
  await expect(user1.locator('[data-testid="online-count"]')).toHaveText(
    "2 online",
  );
  await expect(user2.locator('[data-testid="online-count"]')).toHaveText(
    "2 online",
  );

  // User 1 sends message
  await user1.fill('[data-testid="message-input"]', "Hello Bob!");
  await user1.click('[data-testid="send-button"]');

  // User 2 receives and decrypts message
  await expect(user2.locator('[data-testid="message-text"]')).toHaveText(
    "Hello Bob!",
  );
});
```

---

## 10. Security Improvements ($0)

| Issue               | Current                    | Target                                            | Cost |
| ------------------- | -------------------------- | ------------------------------------------------- | ---- |
| Crypto library      | crypto-js.min.js (0 bytes) | **Web Crypto API** (built-in)                     | $0   |
| Key derivation      | None (raw password)        | **PBKDF2 + salt, 600k iterations**                | $0   |
| Encryption cipher   | AES (mode unknown)         | **AES-GCM** (authenticated encryption)            | $0   |
| Password in URL     | `?pw=plaintext`            | **One-time invite token** in URL                  | $0   |
| Password in transit | cleartext Socket.IO        | **Never sent after join** (session token)         | $0   |
| Input validation    | None (server-side)         | **Zod schemas** on every endpoint                 | $0   |
| Rate limiting       | 100/15min global           | **Per-endpoint, per-IP, per-room**                | $0   |
| SQL injection       | Supabase client handles it | **Drizzle ORM** (parameterized queries)           | $0   |
| CSP                 | Helmet defaults            | **Strict CSP** matching target stack              | $0   |
| Secrets in git      | `.env` committed           | **Git-crypt** or **GitHub Actions secrets**       | $0   |
| Auth/RBAC           | None                       | **Ephemeral session tokens** (crypto.randomBytes) | $0   |

---

## 11. Migration Strategy ($0)

### Phase 1: Foundation (do first, parallel-safe)

```
- [ ] Set up monorepo structure (packages/ or apps/)
- [ ] Initialize Vite + React + TypeScript project
- [ ] Set up Drizzle schema + Turso DB
- [ ] Set up Biome + tsc config
- [ ] Set up GitHub Actions CI
- [ ] Set up Cloudflare Pages + Workers project
- [ ] Create base Hono server with health check
- [ ] Implement Web Crypto API encryption utils
```

### Phase 2: Core Features (sequential dependencies)

```
- [ ] Implement room CRUD (create, join, list)
- [ ] Implement token-based invite system
- [ ] Implement message storage (encrypted)
- [ ] Implement WebSocket/presence with Supabase Realtime or Hono WS
- [ ] Build React lobby (create/join forms)
- [ ] Build React chat room (messages, input, header)
- [ ] Implement client-side encryption/decryption
```

### Phase 3: Polish

```
- [ ] Dark mode with system preference detection
- [ ] Responsive mobile layout
- [ ] Loading states and error boundaries
- [ ] Copy invite link UI
- [ ] Room expiry countdown
- [ ] File/image sharing (optional — needs storage)
```

### Phase 4: Quality

```
- [ ] Unit tests for services
- [ ] Component tests for UI
- [ ] E2E tests for full flows (Playwright)
- [ ] Accessibility audit
- [ ] Lighthouse performance optimization
```

### Phase 5: Decommission Old

```
- [ ] Verify new system fully works
- [ ] Keep old Supabase tables as backup
- [ ] Point domain to new Cloudflare deployment
- [ ] Archive old repo branch or tag v1.0.0
```

---

## 12. Zero-Cost Alternatives — Cheat Sheet

| If you wanted...        | Paid Option                   | $0 Alternative                                                                             |
| ----------------------- | ----------------------------- | ------------------------------------------------------------------------------------------ |
| Sentry error tracking   | Sentry Team ($26/mo)          | **Better Stack free tier** (50k logs/mo) or **self-hosted Sentry** on Oracle Cloud free VM |
| Auth0 auth              | Auth0 ($0 free tier, limited) | **Lucia Auth** (open source) + **session tokens** (crypto.randomBytes)                     |
| UploadThing file upload | UploadThing free (2GB)        | **Cloudflare R2** (10GB free) or **Supabase Storage** (1GB free)                           |
| Prisma ORM              | Prisma Cloud/Accelerate       | **Drizzle ORM** (same DX, no paid tier needed)                                             |
| Turso DB                | Turso Scale ($)               | **Turso free tier** (9GB, 1B reqs) is extremely generous                                   |
| Supabase                | Supabase Pro ($25/mo)         | **Supabase free tier** (500MB, 50k MAU)                                                    |
| Vercel Analytics        | Vercel Analytics ($)          | **Plausible self-hosted** (Docker, free) or **Umami** (free)                               |
| Algolia search          | Algolia ($)                   | **MeiliSearch** (self-hosted, free) or SQLite FTS5                                         |
| SendGrid email          | SendGrid ($)                  | **Resend free tier** (100 emails/day) or **SMTP2GO free** (1000/mo)                        |
| Pusher realtime         | Pusher ($49/mo)               | **Supabase Realtime** (free tier) or **WebSockets via Hono**                               |
| Socket.IO               | Free but heavy                | **Hono WS** (lighter) or **Supabase Realtime**                                             |
| Redis cache             | Redis Labs (free 30MB)        | **SQLite in-memory**, or **Cloudflare KV** (free 100k reads/day)                           |
| Docker hosting          | AWS/Azure/GCP                 | **Oracle Cloud free VM** (4 ARM, 24GB RAM) or **Fly.io free tier**                         |
| CI/CD minutes           | GitHub Actions (2000 free)    | **2000 min/month is generous** for a small project. Or use **Cloudflare Pages auto-build** |
| SSL certificate         | Paid CA                       | **Cloudflare** (free SSL), **Let's Encrypt** (free), **ZeroSSL** (free)                    |
| CDN                     | Cloudflare Pro ($20/mo)       | **Cloudflare Free** (unlimited CDN)                                                        |
| Postgres                | Supabase Pro / Neon Scale     | **Neon free** (0.5GB) or **Supabase free** (500MB) or **SQLite via Turso**                 |

---

## 13. Key Differences: Current vs Target

| Aspect                | Current                                   | Target ($0)                                |
| --------------------- | ----------------------------------------- | ------------------------------------------ |
| **Server file**       | Single monolithic `server.js` (470 lines) | Modular: routes/ services/ middleware/ ws/ |
| **Backend framework** | Express 5                                 | Hono (lighter, edge-compatible, free)      |
| **Real-time**         | Socket.IO (heavy, separate dep)           | Supabase Realtime or Hono WS (lighter)     |
| **Database**          | Supabase Postgres (500MB free)            | Turso SQLite (9GB free) or keep Supabase   |
| **ORM**               | None (raw Supabase JS)                    | Drizzle ORM (type-safe, free)              |
| **Frontend**          | Vanilla JS (spaghetti)                    | React + TypeScript + Vite (free)           |
| **CSS**               | Custom CSS (1478 lines total)             | Tailwind CSS v4 (utility, no runtime cost) |
| **Encryption**        | crypto-js (0 bytes, broken)               | Web Crypto API (built-in, free, no deps)   |
| **Key derivation**    | None (raw password = AES key)             | PBKDF2 + salt (600k iterations)            |
| **Invite system**     | Password in URL (insecure)                | One-time token in URL (secure)             |
| **Validation**        | None                                      | Zod schemas (free, type-safe)              |
| **Testing**           | None                                      | Vitest + Playwright (free)                 |
| **Linting**           | None                                      | Biome (free, fast)                         |
| **CI/CD**             | None                                      | GitHub Actions (free)                      |
| **Hosting**           | Self/docker/VPS                           | Cloudflare Pages + Workers (free)          |
| **Monitoring**        | None                                      | Better Stack free tier or pino logs        |
| **Types**             | None (plain JS)                           | TypeScript (strict mode, free)             |

---

## Appendix: Quick Start — Building Phase 1 in One Command

```bash
# Create the new project alongside the old one
mkdir VanisChat-v2 && cd VanisChat-v2

# Initialize
bun create vite . --template react-ts
bun add hono drizzle-orm @libsql/client zod
bun add -D drizzle-kit biome vitest @playwright/test
bunx playwright install

# Set up Turso
bunx turso db create vanischat
bunx turso db show vanischat --url  # save this

# Set up Cloudflare (requires wrangler login)
bunx wrangler init -y
bunx wrangler pages project create vanischat

# Start developing
bun run dev
```

> **Note**: If you don't want Bun, use `npm` or `yarn` — all tools above work with any package manager equally. Bun just makes `create`, `install`, and running faster.
