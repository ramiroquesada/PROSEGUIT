import type { Request } from 'express';
import cors from 'cors';
import { env } from './env.js';

const developmentOriginPattern = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/;

export interface OriginPolicy {
  isProduction: boolean;
  /** Origenes extra, para cuando el frontend se sirve desde otro dominio. */
  allowedOrigins: string[];
}

/**
 * true si el Origin apunta al mismo host por el que entro el pedido.
 *
 * El navegador manda Origin en todo pedido que no sea GET/HEAD, incluso cuando
 * es del mismo origen. Por eso el login (POST) fallaba mientras la navegacion
 * andaba: los GET del mismo origen no llevan Origin.
 *
 * nginx reenvia el Host original con proxy_set_header Host $http_host, asi que
 * comparar contra el alcanza y funciona con cualquier IP o dominio sin tener
 * que configurar nada.
 */
export function isSameOrigin(origin: string, host: string | undefined): boolean {
  if (!host) return false;

  try {
    return new URL(origin).host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}

export function isOriginAllowed(
  origin: string | undefined,
  host: string | undefined,
  policy: OriginPolicy,
): boolean {
  // Sin Origin no hay nada que validar: health checks, curl, y los GET del
  // mismo origen entran por aca.
  if (!origin) return true;

  if (isSameOrigin(origin, host)) return true;

  if (!policy.isProduction && developmentOriginPattern.test(origin)) return true;

  return policy.allowedOrigins.includes(origin);
}

export function resolvePolicy(): OriginPolicy {
  return {
    isProduction: env.nodeEnv === 'production',
    allowedOrigins: env.cors.allowedOrigins,
  };
}

/**
 * Se usa la forma `cors(fn)` en vez de pasar un objeto con `origin`, porque el
 * paquete invoca esa funcion sin el request y no habria manera de leer el Host.
 *
 * Un origen no permitido nunca responde con un Error: el paquete lo derivaria a
 * next(), el manejador de errores lo tomaria como fallo del servidor y
 * devolveria un 500 — que es exactamente lo que hacia fallar el login en el
 * despliegue. Devolviendo `origin: false` simplemente no se agregan las
 * cabeceras CORS y es el navegador el que bloquea la respuesta, que es como
 * CORS tiene que funcionar.
 */
export const corsOptionsDelegate: cors.CorsOptionsDelegate<Request> = (req, callback) => {
  const allowed = isOriginAllowed(req.headers.origin, req.headers.host, resolvePolicy());

  callback(null, {
    origin: allowed,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
};
