# VanisChat Phase 1 — Foundation

**Date:** 2026-05-25  
**Status:** Draft  
**Budget:** $0 (all services on free tier)  
**Estimated effort:** ~4–6 hours  

## 1. Purpose

Lay the entire project scaffold, tooling, database, CI/CD, and deployment infrastructure so that Phase 2 can focus purely on feature code. At the end of this phase, running `git push main` triggers a full CI pipeline and deploys a working health-check endpoint to Cloudflare — but no chat logic exists yet.

## 2. Scope

### In scope
- Monorepo directory structure
- Vite + React 19 + TypeScript (strict) frontend scaffold
- Hono server skeleton with `GET /health`
- Drizzle ORM schema (rooms, messages, room_tokens) + Turso database provisioned
- Biome linter + formatter config
- Vitest test setup with at least one smoke test
- Web Crypto API encryption utilities (pure functions, unit-tested)
- GitHub Actions CI workflow (lint → typecheck → test → build)
- Cloudflare Pages (frontend) + Workers (backend) deployment config
- All configuration committed and CI green

### Out of scope
- Any room CRUD logic
- Any WebSocket handler
- Any React components beyond the `App` shell
- Any invite token logic
- Any message encryption integration (the crypto *functions* exist, but nothing calls them yet)

## 3. Directory Structure

Target layout after Phase 1:

```
VanisChat/
├── apps/
│   └── web/                    # React + Vite frontend
│       ├── src/
│       │   ├── App.tsx         # Minimal shell ("VanisChat v2")
│       │   ├── main.tsx        # Entry point
│       │   └── index.css       # Tailwind base import
│       ├── index.html
│       ├── vite.config.ts
│       ├── tsconfig.json
│       ├── biome.json
│       └── package.json
├── packages/
│   ├── api/                    # Hono server
│   │   ├── src/
│   │   │   ├── index.ts        # Hono app + export
│   │   │   ├── routes/
│   │   │   │   └── health.ts   # GET /health
│   │   │   └── db/
│   │   │       ├── schema.ts   # Drizzle schema definitions
│   │   │       └── index.ts    # DB client init
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── crypto/                 # Shared encryption utilities
│       ├── src/
│       │   ├── index.ts        # Re-export all
│       │   ├── derive-key.ts   # PBKDF2 key derivation
│       │   ├── encrypt.ts      # AES-GCM encryption
│       │   ├── decrypt.ts      # AES-GCM decryption
│       │   └── utils.ts        # base64 helpers
│       ├── package.json
│       └── tsconfig.json
├── tooling/
│   ├── biome-config.json       # Shared lint/format config
│   └── ts-base.json            # Shared TS config
├── .github/
│   └── workflows/
│       └── ci.yml              # CI pipeline
├── .gitignore
├── package.json                # Root workspace config
├── turbo.json                  # (optional, if using Turborepo)
└── wrangler.toml               # CF Workers config (deployed from packages/api)
```

## 4. Tech Decisions

### Build tool
- **Vite** for frontend (next-gen bundler, fast HMR)
- **tsup** or **tsx** for server builds (lightweight, no config needed for Workers)

### Workspace manager
- Bun workspaces (built-in, zero config) or npm workspaces. Prefer Bun for speed.

### Package split rationale
| Package | Why separate |
|---------|-------------|
| `apps/web` | Frontend assets deployed to CF Pages |
| `packages/api` | Backend deployed to CF Workers |
| `packages/crypto` | Shared between web + api. Web uses it client-side for encrypt/decrypt. API only uses it for server-side hash verification. Separating ensures tree-shakeable for web |

### Database schema (initial)

```sql
CREATE TABLE rooms (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    password   TEXT NOT NULL,   -- argon2id hash
    salt       TEXT NOT NULL,   -- for client-side PBKDF2
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE messages (
    id          TEXT PRIMARY KEY,
    room_id     TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    sender_name TEXT NOT NULL,
    content     TEXT NOT NULL,   -- base64 AES-GCM ciphertext
    iv          TEXT NOT NULL,   -- base64 IV
    type        TEXT NOT NULL DEFAULT 'text' CHECK(type IN ('text','image','file','system')),
    file_url    TEXT,
    file_type   TEXT,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE room_tokens (
    id         TEXT PRIMARY KEY,
    room_id    TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    type       TEXT NOT NULL CHECK(type IN ('invite','session')),
    expires_at INTEGER NOT NULL,
    uses_left  INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_messages_room_time ON messages(room_id, created_at DESC);
CREATE INDEX idx_rooms_expires ON rooms(expires_at);
CREATE INDEX idx_tokens_room ON room_tokens(room_id, type);
```

### Encryption utilities (`packages/crypto`)
- `deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey>`
- `encrypt(plaintext: string, key: CryptoKey): Promise<{ciphertext: string, iv: string}>`
- `decrypt(payload: {ciphertext: string, iv: string}, key: CryptoKey): Promise<string>`
- `generateSalt(): Uint8Array` — wrapper around `crypto.getRandomValues(16)`
- `arrayBufferToBase64(buf: ArrayBuffer): string`
- `base64ToArrayBuffer(b64: string): ArrayBuffer`

All pure functions, no side effects. No global state.

### CI Pipeline

```yaml
# .github/workflows/ci.yml
- lint:   biome check .
- typecheck: tsc --noEmit (all packages)
- test:  vitest run (all packages)
- build: vite build (web) + tsup (api)
- deploy: wrangler pages deploy (web) + wrangler deploy (api)
```

Runs on push to `main` and on PRs. Deploy step skipped on PRs.

## 5. Acceptance Criteria

- [ ] `bun install` succeeds from repo root (workspace resolution works)
- [ ] `bun run lint` passes with zero warnings
- [ ] `bun run typecheck` passes with strict TypeScript
- [ ] `bun run test` passes (at minimum: crypto functions round-trip, health endpoint returns 200)
- [ ] `bun run build` produces deployable output for both web and api
- [ ] Turso database is provisioned and Drizzle can run migrations against it
- [ ] `GET /health` deployed to CF Workers returns `{ status: "ok", timestamp: <unix> }`
- [ ] CF Pages serves the static Vite app at `*.pages.dev`
- [ ] CI runs green on push to a branch (can test with a temporary branch)
- [ ] All `.env` secrets are documented in `.env.example` (not committed as real values)

## 6. Files to Create (Estimated)

| Count | Type | Examples |
|-------|------|---------|
| ~15 | Source files | `index.ts`, `schema.ts`, `derive-key.ts`, `encrypt.ts`, `health.ts` |
| ~8 | Config files | `biome.json`, `vite.config.ts`, `wrangler.toml`, `tsconfig.json` ×3, `.env.example` |
| ~3 | Config files (CI) | `ci.yml` |
| ~3 | Test files | `crypto.test.ts`, `health.test.ts` |

## 7. Dependencies / External Setup

The following accounts must exist before Phase 1 is done:
- **Turso account** (free, GitHub login) — for `turso db create`
- **Cloudflare account** (free) — for Pages + Workers + `wrangler login`
- **GitHub repo** (exists: `ajilenakh/VanisChat`)

Env vars to document in `.env.example`:
```
TURSO_DB_URL=
TURSO_AUTH_TOKEN=
CLOUDFLARE_API_TOKEN=
```
