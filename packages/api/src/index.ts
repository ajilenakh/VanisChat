import { Hono } from 'hono';
import { healthRoutes } from './routes/health';

const app = new Hono();

// Mount routes
app.route('/', healthRoutes);

export default app;
