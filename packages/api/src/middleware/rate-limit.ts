import type { Context, Next } from 'hono';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const ipMap = new Map<string, RateLimitEntry>();

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of ipMap) {
    if (entry.resetAt < now) ipMap.delete(key);
  }
}, 300_000);

export function rateLimit(opts: { max: number; windowMs: number }) {
  return async function rateLimitMiddleware(c: Context, next: Next) {
    const ip =
      c.req.header('cf-connecting-ip') ||
      c.req.header('x-forwarded-for') ||
      `unknown:${c.req.path}`;

    const now = Date.now();
    const entry = ipMap.get(ip);

    if (!entry || entry.resetAt < now) {
      ipMap.set(ip, { count: 1, resetAt: now + opts.windowMs });
      await next();
      return;
    }

    entry.count++;
    if (entry.count > opts.max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      c.header('Retry-After', String(retryAfter));
      return c.json({ error: 'rate_limited', retryAfter }, 429);
    }

    await next();
  };
}
