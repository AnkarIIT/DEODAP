import 'dotenv/config';
import express from 'express';
import path from 'path';
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
import adminRoutes from './server/routes/admin';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Global Middlewares
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(authMiddleware);

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
  app.use('/api/admin', adminRoutes);

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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[BharatCart Backend] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal: Failed to start server:', err);
  process.exit(1);
});
