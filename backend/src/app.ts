import express from 'express';
import cors from 'cors';
import path from 'path';
import { mkdirSync } from 'fs';
import { corsOptions } from './config/cors.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestIdMiddleware } from './middleware/request-id.js';
import authRoutes from './modules/auth/auth.routes.js';
import equipmentRoutes from './modules/equipment/equipment.routes.js';
import locationsRoutes from './modules/locations/locations.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import historyRoutes from './modules/history/history.routes.js';
import loansRoutes from './modules/loans/loans.routes.js';
import licensesRoutes from './modules/licenses/licenses.routes.js';
import modelTemplatesRoutes from './modules/model-templates/model-templates.routes.js';
import serviceProvidersRoutes from './modules/service-providers/service-providers.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import { APP_VERSION } from './config/version.js';

const app = express();

const uploadsDir = path.join(process.cwd(), 'uploads');
mkdirSync(uploadsDir, { recursive: true });

app.use(requestIdMiddleware);
app.use(cors(corsOptions));
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'none'");
  next();
});

app.get('/api/v1/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    db: 'connected',
  });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/equipment', equipmentRoutes);
app.use('/api/v1/locations', locationsRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/history', historyRoutes);
app.use('/api/v1/loans', loansRoutes);
app.use('/api/v1/licenses', licensesRoutes);
app.use('/api/v1/model-templates', modelTemplatesRoutes);
app.use('/api/v1/service-providers', serviceProvidersRoutes);
app.use('/api/v1/users', usersRoutes);

app.use(errorHandler);

export default app;
