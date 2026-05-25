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
