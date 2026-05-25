# VanisChat Phase 3 — Polish

**Date:** 2026-05-25  
**Status:** Draft  
**Budget:** $0  
**Depends on:** Phase 2 (core features working)  
**Estimated effort:** ~6–8 hours  

## 1. Purpose

Transform the functional-but-bare Phase 2 UI into a polished, production-quality experience. Dark mode, responsive mobile layout, loading states, error boundaries, invite copy UX, room expiry countdown, and file upload support.

## 2. Scope

### In scope
- Dark/light theme with system preference detection + manual toggle
- Responsive mobile layout (works on 375px–1920px screens)
- Loading states (skeleton screens, spinner during create/join/send)
- Error boundaries (per-page catch, `ErrorFallback` component with retry button)
- Invite link copy button with toast/confirmation ("Copied!")
- Room expiry countdown (real-time countdown in header, accurate to second)
- File/image sharing via R2 presigned URLs (optional — behind a feature flag)
- Toast notification system for ephemeral messages (copied, error, user joined/left)

### Out of scope
- Unit/component/E2E tests (Phase 4)
- Accessibility audit (Phase 4)
- Performance audit (Phase 4)
- Any new feature beyond polish + file upload

## 3. Theme System

```
Detection order:
  1. User's system preference (prefers-color-scheme: dark)
  2. Manual toggle stored in localStorage("vanischat-theme")
  3. Default to light if neither

Implementation:
  - CSS custom properties on :root and [data-theme="dark"]
  - Tailwind dark mode via class strategy (dark: variant)
  - ThemeContext + ThemeProvider wraps entire app
  - Toggle button in header (moon/sun icon via Lucide)
  - No flash of wrong theme: inline <script> in index.html reads localStorage before React hydrates
```

### Color tokens

| Token | Light | Dark |
|-------|-------|------|
| `--bg-primary` | `#FFFFFF` | `#0F172A` (slate-900) |
| `--bg-secondary` | `#F8FAFC` (slate-50) | `#1E293B` (slate-800) |
| `--bg-tertiary` | `#F1F5F9` (slate-100) | `#334155` (slate-700) |
| `--text-primary` | `#0F172A` | `#F8FAFC` |
| `--text-secondary` | `#64748B` (slate-500) | `#94A3B8` (slate-400) |
| `--accent` | `#6366F1` (indigo-500) | `#818CF8` (indigo-400) |

## 4. Responsive Layout

Breakpoints:
- **Mobile:** < 640px — single column, full-width inputs, bottom-sheet message input
- **Tablet:** 640–1024px — wider inputs, sidebar optional, max-width container
- **Desktop:** > 1024px — centered container (max 768px for chat), comfortable padding

Key responsive behaviors:
- Chat input bar sticks to bottom of viewport on mobile keyboard
- Message bubbles: max-width 85% on mobile, 70% on desktop
- Lobby forms stack vertically on mobile, side-by-side on desktop (if tabs allow)
- Header collapses: timer + online count shown as compact badges on mobile

## 5. File/Image Upload (Optional)

Gated behind `VITE_ENABLE_FILE_UPLOAD=true` env var. Off by default in Phase 3.

### Flow
```
1. User clicks upload button in MessageInput (paperclip icon)
2. Client requests presigned upload URL:
   POST /api/rooms/:id/upload-url {sessionToken, fileName, fileType, fileSize}
3. Server validates session, generates R2 presigned PUT URL (expires 5 min)
4. Client uploads file directly to R2 (bypasses server)
5. Client sends message with type: "image"|"file", fileUrl, fileType
6. Recipients see rendered image or download link
```

### Limits
- Max file size: 10MB (enforced server-side in presigned URL step)
- Allowed types: `image/*`, `application/pdf`, `text/*`, `application/zip`
- Storage: R2 free tier = 10GB. Sufficient for hundreds of thousands of chat images.

### UI
- Image messages render inline (max 300px height, click to expand)
- File messages show icon + filename + size + download button
- Upload progress bar during upload to R2

## 6. Error Boundaries

```
ErrorBoundary component wraps each route:
  <ErrorBoundary fallback={<ErrorFallback />}>
    <LobbyPage />
  </ErrorBoundary>
  <ErrorBoundary fallback={<RoomErrorFallback />}>
    <ChatPage />
  </ErrorBoundary>

ErrorFallback shows:
  - Icon (Lucide `alert-triangle`)
  - "Something went wrong" title
  - Error message (in dev mode, generic in prod)
  - "Try again" button → clears error state, remounts children
  - "Go home" link → navigate to /
```

## 7. Acceptance Criteria

- [ ] Dark mode matches system preference on first visit
- [ ] Manual toggle persists across page refreshes
- [ ] No flash of wrong theme on page load
- [ ] Layout works on 375px wide screen (Chrome DevTools iPhone SE)
- [ ] Layout works on 1920px wide screen
- [ ] Keyboard doesn't overlap chat input on mobile (test with Android Chrome)
- [ ] Create/join forms show spinner during API call, disable button to prevent double-submit
- [ ] Error boundary catches React render crash and shows fallback UI
- [ ] Copy invite link shows "Copied!" toast
- [ ] Room expiry countdown decrements every second, shows warning color at < 5 min
- [ ] Toast notifications appear and auto-dismiss after 3 seconds
- [ ] File upload (if enabled): image renders inline, file shows download link
- [ ] File upload (if enabled): >10MB file returns error, no R2 upload initiated
- [ ] All Phase 2 features still work (regression check smoke test)
