import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import logRoutes from './routes/log.routes';

import authRoutes from './routes/auth.routes';

const app: Express = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Basic health check route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'FlowCare API is running!' });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/logs', logRoutes);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[Error]:', err.message);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

export default app;
