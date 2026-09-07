import app from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { prisma } from './utils/prisma.js';

const server = app.listen(env.port, () => {
  logger.info({ port: env.port, env: env.nodeEnv }, 'API iniciada');
});

let shuttingDown = false;

const shutdown = (signal: NodeJS.Signals) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Cerrando API');

  const forcedShutdown = setTimeout(() => {
    logger.error('Cierre forzado después de 10 segundos');
    server.closeAllConnections();
    process.exit(1);
  }, 10_000);
  forcedShutdown.unref();

  server.close(async (error) => {
    if (error) {
      logger.error({ error }, 'No se pudo cerrar la API correctamente');
      process.exitCode = 1;
    }

    try {
      await prisma.$disconnect();
      logger.info('API y conexiones de base de datos cerradas');
    } catch (disconnectError) {
      logger.error({ error: disconnectError }, 'No se pudo cerrar el pool de base de datos');
      process.exitCode = 1;
    } finally {
      clearTimeout(forcedShutdown);
    }
  });
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
