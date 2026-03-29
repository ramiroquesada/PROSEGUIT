import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { corsOptions } from './config/cors.js';
import { errorHandler } from './middleware/error-handler.js';
import authRoutes from './modules/auth/auth.routes.js';
import equipmentRoutes from './modules/equipment/equipment.routes.js';
import locationsRoutes from './modules/locations/locations.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import historyRoutes from './modules/history/history.routes.js';
import loansRoutes from './modules/loans/loans.routes.js';
import modelTemplatesRoutes from './modules/model-templates/model-templates.routes.js';
import serviceProvidersRoutes from './modules/service-providers/service-providers.routes.js';
import usersRoutes from './modules/users/users.routes.js';

const app = express();

// Middleware global
app.use(cors(corsOptions));
app.use(express.json());

// Headers de seguridad
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // CSP para respuestas de la API (el frontend SPA requiere CSP en el servidor que lo sirve)
  res.setHeader('Content-Security-Policy', "default-src 'none'");
  next();
});

// Health check
app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rutas
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/equipment', equipmentRoutes);
app.use('/api/v1/locations', locationsRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/history', historyRoutes);
app.use('/api/v1/loans', loansRoutes);
app.use('/api/v1/model-templates', modelTemplatesRoutes);
app.use('/api/v1/service-providers', serviceProvidersRoutes);
app.use('/api/v1/users', usersRoutes);

// Error handler global (Express 5 captura async errors automáticamente)
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`[PROSEGUIT] API corriendo en http://localhost:${env.port}`);
  console.log(`[PROSEGUIT] Entorno: ${env.nodeEnv}`);
});

export default app;
