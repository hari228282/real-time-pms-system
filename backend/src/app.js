import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import config from './config/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import authRoutes from './routes/auth.routes.js';
import projectRoutes from './routes/project.routes.js';
import { taskItemRouter } from './routes/task.routes.js';

const app = express();

// Security
app.use(helmet());

// CORS
app.use(
  cors({
    origin: config.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-socket-id',
    ],
  })
);

// Handle preflight requests
app.options('*', cors());

// Body parser
app.use(express.json());

if (!config.isProd) {
  app.use(morgan('dev'));
}

// Health Check
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
    },
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskItemRouter);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;