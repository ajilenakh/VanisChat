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
