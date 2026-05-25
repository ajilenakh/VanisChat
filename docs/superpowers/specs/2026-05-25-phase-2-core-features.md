# VanisChat Phase 2 — Core Features

**Date:** 2026-05-25  
**Status:** Draft  
**Budget:** $0  
**Depends on:** Phase 1 (scaffold + DB + CI + deploy)  
**Estimated effort:** ~10–14 hours  

## 1. Purpose

Build the entire real-time chat functionality: room creation/join via token-based invites, encrypted message exchange over WebSocket, presence awareness, and the React UI for both lobby and chat room. By the end of Phase 2, two users can create a room, share an invite link, join, send encrypted messages, and see each other's presence — all deployed and tested.

## 2. Scope

### In scope
- HTTP routes: room create, join, leave, message history
- Token-based invite system (one-time invite tokens → session tokens)
- Encrypted message persistence (server stores AES-GCM ciphertext only)
- WebSocket handler: real-time relay, presence (join/leave), typing indicator
- React Lobby page (create room form, join room form, tabs to switch)
- React Chat page (message list with decryption, input bar, header with online count + timer + invite copy + leave)
- Client-side encryption/decryption wired into send/receive flow
- Server-side password hashing (argon2id via Web Crypto or Bun-native `Bun.password`)
- Room expiry handling (server rejects messages to expired rooms, UI shows "room expired")
- Rate limiting per-endpoint (basic: 100 req/min per IP, 20 msg/s per WebSocket)

### Out of scope
- Dark mode (Phase 3)
- Responsive mobile layout (Phase 3)
- File upload (Phase 3)
- Unit/component/E2E tests (Phase 4)
- Accessibility audit (Phase 4)

## 3. API Routes

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | `/api/rooms` | None | `{name, password, expirationMinutes, nickname}` | `{roomId, inviteToken, expiresAt}` |
| POST | `/api/rooms/:id/join` | None | `{inviteToken, nickname}` | `{sessionToken, messages[], room{name,expiresAt,salt}}` |
| POST | `/api/rooms/:id/leave` | Session token | `{}` | `{ok: true}` |
| GET | `/api/rooms/:id/messages` | Session token | Query: `?before=<id>&limit=50` | `{messages[], hasMore}` |
| POST | `/api/rooms/:id/validate-session` | Session token | `{}` | `{valid: boolean, room:{name,expiresAt,salt}}` |

### WebSocket: `ws://<host>/ws/room/:id`

**Auth:** Client sends `{ type: "auth", sessionToken: "..." }` as first message after connect. Server validates token, joins room, acknowledges with `{ type: "auth_ok", roomId }`.

**Events — Client → Server:**
```typescript
{ type: "send_message", content: string, iv: string }
{ type: "typing", isTyping: boolean }
{ type: "heartbeat_ack" }
```

**Events — Server → Client:**
```typescript
{ type: "message", id, senderName, content, iv, createdAt }
{ type: "user_joined", nickname, onlineCount }
{ type: "user_left", nickname, onlineCount }
{ type: "typing", nickname, isTyping }
{ type: "heartbeat" }
{ type: "error", code: string, message: string }
{ type: "room_expired" }
```

## 4. Encryption Flow

```
Room creator enters password on Lobby page
  → deriveKey(password, salt) on client → key stays in memory
  → Server stores salt (random) + argon2id hash of password

Joiner enters same password
  → deriveKey(password, salt_from_room_metadata) → same key
  → Client encrypts all messages with AES-GCM before sending

Send flow:
  Client: encrypt(plaintext, key) → {ciphertext, iv} → WS send {content: ciphertext, iv}
  Server: stores {content, iv} in DB (cannot read — no key)
  Relay: forwards {content, iv, senderName} to all room members
  Other clients: decrypt({content, iv}, key) → plaintext

Server NEVER has access to password or derived key.
Argon2id hash is for invite-only: verifying password on join (server hashes password input, compares to stored hash).
```

## 5. React Component Tree

```
App
├── ThemeProvider          (stub — single theme for now, dark/light in Phase 3)
├── BrowserRouter
│   ├── / → LobbyPage
│   │   ├── Tabs (Create / Join)
│   │   ├── CreateRoomForm
│   │   │   ├── NicknameInput
│   │   │   ├── RoomNameInput
│   │   │   ├── PasswordInput
│   │   │   └── ExpirationSlider (1–1440 min, default 60)
│   │   └── JoinRoomForm
│   │       ├── NicknameInput
│   │       ├── RoomIdInput (pre-filled from ?room= query param)
│   │       └── PasswordInput
│   └── /room/:id → ChatPage
│       ├── ChatHeader
│       │   ├── RoomTitle
│       │   ├── TimerDisplay (countdown to expiry)
│       │   ├── InviteLinkButton (navigator.clipboard)
│       │   ├── OnlineCount ("3 online")
│       │   └── LeaveButton
│       ├── MessageList
│       │   └── Message[]
│       │       ├── SystemNotification (join/leave/expired)
│       │       └── TextMessage (decrypted content)
│       └── MessageInput
│           ├── TextInput
│           └── SendButton
```

### State management
- React Context for `currentRoom` (room metadata + WebSocket instance + connected users)
- Custom hooks:
  - `useRoom(roomId, sessionToken)` — WS lifecycle, auto-reconnect
  - `useMessages(roomId)` — fetches history on mount, appends WS messages
  - `usePresence(ws)` — tracks online count + user list
  - `useCryptoKey(password, salt)` — memoized key derivation

## 6. Acceptance Criteria

- [ ] Create room from lobby → get invite URL with one-time token
- [ ] Join room via invite URL → see message history (empty on first join)
- [ ] Two users in same room see "2 online"
- [ ] Send message from user A → user B receives decrypted message
- [ ] Message is stored encrypted in Turso (verify by querying DB directly)
- [ ] User leaves room → other users see "User left", count decrements
- [ ] User disconnects (closes tab) → other users see departure within 30s
- [ ] Room expires → server rejects new messages, client shows "Room expired"
- [ ] Invite token is single-use: using it twice returns 401
- [ ] Message history loads on join (last 50 messages, paginated)
- [ ] Typing indicator shows/hides as user types
- [ ] Expired rooms don't appear in DB queries (or are cleaned up)
- [ ] Rate limit exceeded → client gets 429, retries with backoff

## 7. Error Handling

| Scenario | HTTP/WS | Response |
|----------|---------|----------|
| Room not found | HTTP | `404 { error: "room_not_found" }` |
| Invalid invite token | HTTP | `401 { error: "invalid_token" }` |
| Room expired | HTTP/WS | `403 { error: "room_expired" }` / WS `room_expired` event |
| Invalid session | WS | `{ type: "error", code: "invalid_session" }` + disconnect |
| Rate limited | HTTP | `429 { error: "rate_limited", retryAfter: 60 }` |
| Malformed body | HTTP | `400 { error: "validation_error", details: ZodError[] }` |
| Server error | HTTP | `500 { error: "internal_error" }` |
| WS reconnect | WS | Client auto-reconnects with exponential backoff (1s, 2s, 4s, max 30s) |
| Decryption failure | Client | Show "[Decryption failed]" placeholder in message bubble |

## 8. WebSocket Reconnection Strategy

```
On disconnect:
  1. Wait 1s, reconnect
  2. If fail, wait 2s, reconnect
  3. If fail, wait 4s, reconnect
  4. ... double up to 30s max interval
  5. On reconnect, re-send auth message with session token
  6. On auth_ok, re-fetch latest messages (to fill gap during disconnect)
  7. Client deduplicates messages by `id` (Set<messageId>)

Max retries: infinite (chat remains open until user leaves or room expires)
```

### Heartbeat / presence timeout

```
Server sends { type: "heartbeat" } every 30s
Client must respond with { type: "heartbeat_ack" } within 10s
If server misses 3 consecutive heartbeat_acks:
  → Mark user as disconnected
  → Broadcast { type: "user_left", nickname, onlineCount } to room
  → Clean up in-memory state for that socket
If user reconnects with same session token within 5 minutes:
  → Restore presence (no new join notification — only if nickname matches)
```

## 9. Dependencies Added in Phase 2

```
Frontend: react-router-dom, tailwindcss v4, lucide-react, date-fns
Backend:  @hono/ws (or @hono/node-ws for Node), @noble/argon2 (argon2id),
          @libsql/client (already in Phase 1)
```

**Note on argon2id:** If deploying to CF Workers, use `@noble/hashes` with argon2id (pure JS, works in edge runtime). If on Node.js/Bun, use `Bun.password` or `bcrypt` (already in current deps). The spec recommends `Bun.password.hash()` and `Bun.password.verify()` for simplicity — zero dependency, Bun-native.
