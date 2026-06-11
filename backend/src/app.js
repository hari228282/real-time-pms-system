import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import config from './config/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import authRoutes from './routes/auth.routes.js';
import projectRoutes from './routes/project.routes.js';
import { taskItemRouter } from './routes/task.routes.js';

/**
 * Express app assembly. Kept separate from server.js so the app (routes + middleware) can be
 * imported in tests without opening ports or connecting to infrastructure.
 */
const app = express();

// Security headers, CORS (incl. the custom x-socket-id header the frontend sends), body parsing.
app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigins,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'x-socket-id'],
  })
);
app.use(express.json());
if (!config.isProd) app.use(morgan('dev'));

// Liveness probe (used by Nginx/health checks).
app.get('/health', (_req, res) => res.json({ success: true, data: { status: 'ok' } }));

// Feature routes.
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskItemRouter);

// Unmatched route -> 404, then the central error handler (must be LAST).
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
