# VanisChat — Agents guide

**Caveman mode: full** — speak terse, drop fluff, keep technical precision. Code/commits/security write normal.

Monorepo (Bun workspaces) — E2EE chat app. Web (React/Vite), API (Hono/Turso), Crypto (Web Crypto).

---

## Workspace packages

| Path | Name | Entry | Runtime |
|------|------|-------|---------|
| `apps/web` | `@vanischat/web` | `src/main.tsx` _(via Vite)_ | Browser |
| `packages/api` | `@vanischat/api` | `src/index.ts` | Bun / CF Workers |
| `packages/crypto` | `@vanischat/crypto` | `src/index.ts` | Browser + Node (Vitest) |

All three extend `tooling/ts-base.json`. API adds `types: ["node", "bun"]`. Web adds `jsx: "react-jsx"` + `types: ["vite/client"]`.

## Exact commands (run from root)

```sh
bun run lint                              # Biome check .
bun run typecheck                         # tsc --noEmit per-package (3 separate invocations)
bun run test                              # Vitest run (root, runs all workspace tests)
bun run build                             # Builds web + api

# Per-package
bun run --filter @vanischat/api test      # API tests only
bun run --filter @vanischat/crypto test   # Crypto tests only
```

**Required order (pre-push enforces it):** lint → typecheck → test

## Dev servers

```sh
# API (Bun dev, port 3001, includes WebSocket)
bun run --filter @vanischat/api dev

# API (Wrangler — Workers-compatible mode, no Bun WS)
bun run --filter @vanischat/api dev:wrangler

# Web (Vite dev, port 5173, proxies /api and /ws to localhost:3001)
bun run --filter @vanischat/web dev
```

Vite config at `apps/web/vite.config.ts` proxies `/api` → `localhost:3001` and `/ws` → `ws://localhost:3001`.

## API architecture

- **Framework:** Hono, exported as default `app`. Routes mounted: `'/'` (health) and `'/api'` (rooms).
- **DB:** Turso (SQLite) via `@libsql/client` + Drizzle ORM. Schema in `packages/api/src/db/schema.ts`. Tables: `rooms`, `messages`, `room_tokens`.
- **Auth:** Ephemeral session tokens (`x-session-token` header), verified via `requireSession` middleware.
- **Endpoints:**
  - `POST /api/rooms` — create (returns invite token)
  - `POST /api/rooms/:id/join` — join with invite token + password (returns session token)
  - `POST /api/rooms/:id/leave` — leave (session required)
  - `GET /api/rooms/:id/messages` — paginated history (session required, `?before=&limit=`)
  - `POST /api/rooms/:id/validate-session` — validate session (no auth req, used for page refresh)
  - `GET /health` — health check
- **Rate limiting:** In-memory `Map<string, {count, resetAt}>`, per-IP. Cleaned every 5 min.
- **DB migration commands:** `db:push`, `db:generate`, `db:migrate` (Drizzle Kit, run from `packages/api`).

## WebSocket

- **Dev:** `packages/api/src/dev.ts` uses `Bun.serve` with native WS. WS handler at `packages/api/src/ws/room.ts`.
- **Production:** Cloudflare Workers handles WS via `upgradeWebSocket()` — the `dev.ts` file is *not* used.
- WS path: `/ws/room/:id`. Protocol: JSON messages with `type` discriminator (`auth`, `send_message`, `typing`, `heartbeat_ack` inbound; `message`, `user_joined`, `user_left`, `typing`, `heartbeat` outbound).
- Client reconnects with exponential backoff (1s–30s). Heartbeat every 30s, disconnect after 3 missed acks.

## Testing quirks

- **Vitest** runs from root. API tests use `pool: 'forks'` with `singleFork: true` (file-based SQLite, no concurrent access).
- **Bun shim:** API tests in `packages/api/src/__tests__/setup.ts` stub `globalThis.Bun.password` because Vitest runs on Node.js.
- **Test DB:** File-based SQLite at `packages/.test-data/test.db` (gitignored, created by setup). Each test run reuses existing data unless cleaned.
- **Crypto tests** use native Web Crypto API (Node.js 22 has it built-in). No setup file needed.
- Tests use static `app.request()` (Hono's test helper) — no running server needed.

## Code style (Biome)

- Single quotes, semicolons always, trailing commas, indent 2 spaces, line width 100.
- `noNonNullAssertion` off (allowed), `useConst` error, `noUnusedVariables` error.

## Commit convention

Conventional commits enforced via husky `commit-msg`:
```
type(optional-scope): description
```
Types: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `perf`, `test`, `ci`, `build`, `revert`.

## Deployment (GitHub Actions)

Pushes to `main` → lint → typecheck → test → build → deploy:
- Web → `wrangler pages deploy apps/web/dist --project-name vanischat`
- API → `wrangler deploy` (uses `wrangler.toml`)

## Env vars

Required: `TURSO_DB_URL`, `TURSO_AUTH_TOKEN`. Deploy secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

## Drizzle migrations

Generated migrations go to `packages/api/drizzle/` — this directory is gitignored. Regenerate with `db:generate` if switching branches that change schema.

---

## Graphify Knowledge Graph

A persistent, queryable knowledge graph of the entire codebase lives at `graphify-out/`. Built on first `/graphify` invocation, auto-updated on every commit via post-commit hook.

### Outputs (all in `graphify-out/`)

| File | Purpose |
|------|---------|
| `graph.json` | Raw graph data (488+ nodes, 620+ edges) |
| `graph.html` | Interactive visualizer — open in browser |
| `GRAPH_REPORT.md` | Audit report with communities, surprises, suggested questions |

### When you see `/graphify` — what to do

- **/graphify query "<question>"** — Before answering codebase questions, check the graph first. Saves tokens and reveals cross-module connections you wouldn't find manually.
- **/graphify `--update`** — Re-extract only changed files after any non-code change (docs, configs, images).
- **/graphify <path>** — Full pipeline on a new subfolder.

### Fast path

If `graphify-out/graph.json` exists when `/graphify` is invoked with a question (not a path), skip extraction and run `graphify query "<question>"` directly. The post-commit hook keeps it current.

### Continuous update

A post-commit hook (`graphify hook install`) re-runs AST extraction after every `git commit`. Code changes are reflected in the graph automatically. Doc/image changes need manual `/graphify --update`.

### Token savings

~16x fewer tokens per query vs raw codebase context (benchmarked at `graphify benchmark`).
