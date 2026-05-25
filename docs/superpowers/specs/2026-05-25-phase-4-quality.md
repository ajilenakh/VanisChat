# VanisChat Phase 4 — Quality

**Date:** 2026-05-25  
**Status:** Draft  
**Budget:** $0  
**Depends on:** Phase 3 (polish complete, file upload optional)  
**Estimated effort:** ~8–12 hours  

## 1. Purpose

Close the quality loop: comprehensive test coverage, accessibility audit, and performance optimization. Phase 4 is where the app goes from "works great" to "production-ready." No new features — only tests, fixes, and optimizations.

## 2. Scope

### In scope
- Unit tests for all service modules
- Component tests for all React components
- Integration tests for all API routes (mocked DB)
- E2E tests for full user flows (Playwright, 2-browser)
- Accessibility audit (keyboard navigation, ARIA, screen reader)
- Lighthouse performance optimization
- Bundle size analysis and reduction where feasible
- Error tracking setup (Better Stack free tier, 50k logs/mo)

### Out of scope
- Decommissioning old stack (Phase 5)
- Performance load testing (>100 concurrent users — capped at 50 for this phase)
- Accessibility certification / compliance documentation

## 3. Testing Strategy

### Unit tests (Vitest)

| Module | File | What to test |
|--------|------|-------------|
| Crypto | `packages/crypto/src/` | `deriveKey` produces deterministic output for same input, `encrypt` + `decrypt` round-trip, different IV produces different ciphertext, wrong key → decryption throws, `generateSalt` produces 16 random bytes |
| Room service | `packages/api/src/services/room.service.ts` | Room creation inserts DB row, expiry validation, room lookup by ID |
| Message service | `packages/api/src/services/message.service.ts` | Message created with correct room_id, pagination returns correct slice, messages deleted with room on cascade |
| Token service | `packages/api/src/services/token.service.ts` | Invite token creation, single-use enforcement, session token validation, expired token rejected |
| Validation | `packages/api/src/lib/validation.ts` | Zod schemas reject invalid input (empty name, bad expiration range, XSS attempts) |

### Component tests (Vitest + React Testing Library)

| Component | What to test |
|-----------|-------------|
| `CreateRoomForm` | Renders all fields, submit calls API with correct data, disabled during loading, shows validation errors inline |
| `JoinRoomForm` | Pre-fills room ID from URL params, password required, submit calls API |
| `ChatHeader` | Shows room title, timer countdown, online count, leave button fires callback |
| `MessageList` | Renders messages in order, auto-scrolls to bottom, shows system notifications |
| `MessageInput` | Send button disabled when empty, text input updates value, Enter key sends |
| `ErrorFallback` | Shows error message, retry button calls onRetry, go home link navigates |
| `ThemeToggle` | Toggles between light/dark, persists to localStorage |

### Integration tests (Vitest + MSW or direct DB mock)

| Route | What to test |
|-------|-------------|
| `POST /api/rooms` | Creates room, returns invite token, stores hashed password |
| `POST /api/rooms/:id/join` | Valid token → session + history, expired token → 401, already used token → 401 |
| `GET /api/rooms/:id/messages` | Paginated results, invalid session → 401, empty room → empty array |
| `POST /api/rooms/:id/leave` | Removes session, subsequent WS events see user as left |
| `GET /health` | Returns 200 with timestamp |

### E2E tests (Playwright)

Full "two browser" flow (from the system design doc):

```
Flow 1: Happy path
  1. Browser A creates room → gets invite URL
  2. Browser B navigates to invite URL → joins with nickname → sees room
  3. Browser A sends message → Browser B receives and decrypts
  4. Both see "2 online"
  5. Browser B leaves → Browser A sees "1 online"

Flow 2: Expired room
  1. Create room with 1 minute expiration
  2. Wait 61 seconds
  3. Send message → gets "room_expired" error

Flow 3: Invalid invite
  1. Navigate to /room/fake?token=badtoken
  2. See error: "Room not found" or "Invalid token"

Flow 4: Dark mode toggle
  1. Page loads in light mode (or system default)
  2. Click toggle → switches to dark
  3. Refresh → persists

Flow 5: File upload (if Phase 3 file upload enabled)
  1. Upload image file
  2. See image render in message list
```

## 4. Accessibility Requirements

| Check | Tool | Threshold |
|-------|------|-----------|
| Keyboard navigation | Manual | All interactive elements reachable via Tab, Enter activates, Escape closes modals/dropdowns |
| ARIA labels | Manual + axe-core | All form inputs have associated labels, dynamic regions have `role="log"` (message list), toast has `role="status"` |
| Color contrast | axe-core | All text meets WCAG AA (4.5:1 normal, 3:1 large) in both themes |
| Screen reader | VoiceOver / NVDA | Message list announces new messages, room join/leave announced, notifications read aloud |
| Focus management | Manual | After modal opens, focus moves to first element. After close, focus returns to trigger. Message list auto-focuses input on mount |
| Reduced motion | CSS `@media (prefers-reduced-motion)` | Disable auto-scroll animations, disable toast slide-in |

## 5. Performance Targets

| Metric | Current target | Tool |
|--------|---------------|------|
| Lighthouse Performance | > 90 | Lighthouse CI in GitHub Actions |
| Lighthouse Accessibility | > 95 | Lighthouse CI |
| Bundle size (JS) | < 150 KB gzipped | `vite-bundle-visualizer` |
| Bundle size (CSS) | < 20 KB gzipped | Tailwind purging + manual review |
| First Contentful Paint | < 1.5s | Lighthouse, simulated 4G |
| Time to Interactive | < 2.5s | Lighthouse, simulated 4G |

### Bundle optimization tactics
- Dynamic imports for Lobby vs Chat pages (code-split by route)
- `lucide-react` — only import icons used (tree-shakeable by default)
- `date-fns` — import individual functions, not the full library
- Tailwind — purge unused classes in production build (automatic)
- Avoid large deps: no moment, no lodash, no axios

## 6. Error Monitoring

### Better Stack (free tier: 50k log lines/month)

```
Log format: structured JSON via pino
Minimum log level deployed: warn

Events to log:
  - Room creation (info)
  - Join attempt with invalid token (warn)
  - Decryption failure (warn)
  - WS disconnect without explicit leave (info)
  - Server error (error)
  - Rate limit hit (info)
  - Unknown route hit (warn)

No PII in logs: no passwords, no message content, no IP addresses (anonymized)
```

## 7. Acceptance Criteria

- [ ] All unit tests pass (crypto, room, message, token, validation)
- [ ] All component tests pass (CreateRoomForm, JoinRoomForm, ChatHeader, MessageList, MessageInput, ErrorFallback, ThemeToggle)
- [ ] All integration tests pass (health, room CRUD, join/leave, messages)
- [ ] All E2E tests pass (happy path, expiry, invalid invite, dark mode, file upload)
- [ ] Keyboard navigation: every interactive element reachable and operable without mouse
- [ ] Axe-core scan: zero violations on Lobby page and Chat page (both themes)
- [ ] Lighthouse Performance score ≥ 90
- [ ] Lighthouse Accessibility score ≥ 95
- [ ] Bundle size < 150 KB JS gzipped, < 20 KB CSS gzipped
- [ ] Better Stack receiving structured logs from deployed Workers
- [ ] All Phase 1-3 features pass regression smoke test
