import cors from 'cors';

const developmentOriginPattern = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/;

export const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    // Las solicitudes sin Origin (health checks, herramientas de servidor) no
    // requieren CORS. En desarrollo permitimos los hosts locales para que Vite
    // pueda asignar un puerto alternativo si el habitual ya está ocupado.
    if (!origin || (process.env.NODE_ENV !== 'production' && developmentOriginPattern.test(origin))) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origen no permitido por CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
