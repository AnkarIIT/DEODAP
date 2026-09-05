import 'dotenv/config';
import express from 'express';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db';
import { authMiddleware } from './server/middleware/auth';
import authRoutes from './server/routes/auth';
import productRoutes from './server/routes/products';
import cartRoutes from './server/routes/cart';
import orderRoutes from './server/routes/orders';
import paymentRoutes from './server/routes/payments';
import returnRoutes from './server/routes/returns';
import accountRoutes from './server/routes/account';
import { catalogSyncWorker } from './server/automation/CatalogSyncWorker';
import { NextFunction, Request, Response } from 'express';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Trust proxy for correct client IPs behind reverse proxy (rate limiting)
  app.set('trust proxy', 1);

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS - allow only configured frontend origin(s)
  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.use(
    cors({
      origin: allowedOrigins,
      credentials: false,
    })
  );

  // Rate limiting
  const generalApiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 150,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' },
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many attempts. Please try again later.' },
  });

  const paymentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 90,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many payment requests. Please try again later.' },
  });

  // Global Middlewares
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(authMiddleware);
  app.use('/api', generalApiLimiter);
  app.use('/api/auth', authLimiter);
  app.use('/api/payments', paymentLimiter);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      platform: 'Shoply Ecommerce Platform',
      database: 'Neon Serverless PostgreSQL',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // Neon Database status check
  app.get('/api/database/status', async (req, res) => {
    try {
      const status = await db.getNeonDbStatus();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ connected: false, error: err.message });
    }
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/returns', returnRoutes);
  app.use('/api/account', accountRoutes);

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Centralized error handler - never leak stack traces in production
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production' ? 'Something went wrong. Please try again.' : err.message || 'Something went wrong.';
    console.error(`[ErrorHandler] ${status} ${req.method} ${req.originalUrl}`, err?.stack || err);
    res.status(status).json({
      success: false,
      error: {
        code: err.code || 'INTERNAL_ERROR',
        message,
      },
    });
  });

  if (process.env.VERCEL) {
    return app;
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Shoply Backend] Server running on http://0.0.0.0:${PORT}`);
    // Start the catalog sync scheduler explicitly - never on import.
    catalogSyncWorker.start();
  });

  // Graceful shutdown
  const shutdown = (signal: string) => {
    console.log(`\n[Shoply Backend] Received ${signal}. Shutting down gracefully...`);
    catalogSyncWorker.stop();
    server.close(() => {
      console.log('[Shoply Backend] HTTP server closed. Bye.');
      process.exit(0);
    });
    setTimeout(() => {
      console.error('[Shoply Backend] Forced exit after timeout.');
      process.exit(1);
    }, 8000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

export const appPromise = startServer();
export default async (req: any, res: any) => {
  const app = await appPromise;
  return app(req, res);
};