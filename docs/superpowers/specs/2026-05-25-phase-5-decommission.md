# VanisChat Phase 5 — Decommission Old Stack

**Date:** 2026-05-25  
**Status:** Draft  
**Budget:** $0  
**Depends on:** Phase 4 (quality verified)  
**Estimated effort:** ~2–3 hours  

## 1. Purpose

Gracefully sunset the old VanisChat stack (Express + Socket.IO + Supabase + vanilla JS) and switch to the new stack (Hono + Turso + React + Cloudflare). This is the least-technical phase but the most operationally important — a botched cutover loses data or breaks the live URL.

## 2. Scope

### In scope
- Verify feature parity between old and new system
- Keep old Supabase tables as read-only backup (do not delete)
- Point custom domain (if any) to Cloudflare Pages
- Tag v1.0.0 on current `main` branch
- Archive old branch or tag so it's retrievable but not active
- Remove old `server.js`, `public/`, `docker-compose.yml`, `Dockerfile` from active development
- Update repo README to point to new stack

### Out of scope
- Migrating old Supabase data to Turso (rooms are temporary, old messages are legacy — not worth migrating)
- Deleting Supabase project (keep as backup; free tier costs $0)
- DNS changes if no custom domain exists (stay on `*.pages.dev`)

## 3. Cutover Checklist

### Pre-cutover verification

- [ ] New system deployed to CF Pages + Workers
- [ ] Room creation works end-to-end
- [ ] Invite link flow works (share → open in incognito → join)
- [ ] Messages send and decrypt correctly
- [ ] Room expiry works (auto-cleanup)
- [ ] All E2E tests pass on deployed URL (not just localhost)
- [ ] Dark mode, responsive layout, error boundaries all working on deployed URL
- [ ] HTTPS working (Cloudflare provides automatic SSL)
- [ ] No console errors in production build

### Cutover steps

1. **Tag old system**
   ```bash
   git tag v1.0.0 -m "Legacy Express + Supabase + vanilla JS stack"
   git push origin v1.0.0
   ```

2. **Document old stack for archival**
   Create `ARCHIVE.md` at repo root:
   ```markdown
   # VanisChat v1 (Legacy)
   - Tag: v1.0.0
   - Stack: Express 5 + Socket.IO + Supabase + vanilla JS
   - Decommissioned: 2026-05-25
   - Supabase project: [link] (read-only)
   - To restore: `git checkout v1.0.0 && docker compose up`
   ```

3. **Remove old files from active development**
   ```bash
   git rm server.js
   git rm -r public/
   git rm docker-compose.yml
   git rm Dockerfile
   git rm schema.sql
   ```

4. **Update README**
   - Replace build/run instructions with new stack instructions
   - Add link to ARCHIVE.md for old docs
   - Add deployment URL badge

5. **Domain switch** (if custom domain configured in Cloudflare)
   - Update DNS A record / CNAME to point to Cloudflare Pages
   - Wait for propagation (5–30 minutes)
   - Verify HTTPS works on custom domain

6. **Final smoke test on production URL**
   - Create room
   - Share with another browser
   - Send messages
   - Verify error states still work

### Rollback plan

If cutover fails (critical bug found post-deploy):
1. Revert file deletion: `git checkout v1.0.0 -- server.js public/ docker-compose.yml Dockerfile schema.sql`
2. Restore DNS to old server IP (if custom domain)
3. Tag new system as `v2.0.0-alpha` for debugging
4. Mark cutover as failed in repo discussion / commit message

Rollback should take < 15 minutes.

## 4. Data & Backup

### Old data (Supabase)
- **Rooms table:** All old rooms are expired (created months ago). No active rooms to migrate.
- **Messages table:** Old messages stay in Supabase. Do not delete. Keep as read-only archive.
- **If needed for reference:** The `schema.sql` file is committed in the `v1.0.0` tag and `ARCHIVE.md` links to Supabase dashboard.

### New data (Turso)
- Turso stores all new rooms and messages.
- Messages older than 7 days are deleted by cron (if configured) or manual cleanup.

## 5. Post-Cutover

- [ ] Monitor Better Stack logs for errors spike after cutover
- [ ] Check Turso DB request count (stays within 1B/mo free tier)
- [ ] Check CF Workers request count (stays within 100K/day)
- [ ] Run E2E tests again 24h post-cutover (catch any time-sensitive issues)
- [ ] Remove old Supabase service role key from GitHub secrets (no longer needed)
- [ ] Update any bookmark/links that pointed to old URL

## 6. Acceptance Criteria

- [ ] `v1.0.0` tag exists in git history
- [ ] `ARCHIVE.md` written and committed
- [ ] Old source files removed from `main` branch
- [ ] README updated with new build/run/deploy instructions
- [ ] Live URL serves the new React app
- [ ] Room creation + messaging works on production URL
- [ ] Supabase project still accessible (read-only) — not deleted
- [ ] Rollback plan is documented (not just in this spec — in a commit message or GitHub issue)
- [ ] Rollback is tested: `git checkout v1.0.0 -- <files>` + `docker compose up` gets old stack running in < 15 min
