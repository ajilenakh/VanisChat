import { app } from './index';

const port = process.env.PORT ? Number.parseInt(process.env.PORT) : 3001;
console.log(`Dev server on http://localhost:${port}`);

Bun.serve({
  fetch: app.fetch,
  port,
});
