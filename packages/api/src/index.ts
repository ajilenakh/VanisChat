import { Hono } from 'hono';
import { healthRoutes } from './routes/health';
import { roomRoutes } from './routes/room';

const app = new Hono();

// Mount routes
app.route('/', healthRoutes);
app.route('/api', roomRoutes);

export { app };
export default app;
