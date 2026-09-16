import { describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { isOriginAllowed, isSameOrigin, type OriginPolicy } from './cors.js';

const production: OriginPolicy = { isProduction: true, allowedOrigins: [] };
const development: OriginPolicy = { isProduction: false, allowedOrigins: [] };

describe('isSameOrigin', () => {
  it('matches the host the request came in through', () => {
    expect(isSameOrigin('http://10.20.10.191', '10.20.10.191')).toBe(true);
    expect(isSameOrigin('https://inventario.soriano.gub.uy', 'inventario.soriano.gub.uy')).toBe(true);
  });

  it('takes the port into account', () => {
    expect(isSameOrigin('http://10.20.10.191:8080', '10.20.10.191:8080')).toBe(true);
    expect(isSameOrigin('http://10.20.10.191:8080', '10.20.10.191')).toBe(false);
  });

  it('is case insensitive on the host', () => {
    expect(isSameOrigin('http://Inventario.Local', 'inventario.local')).toBe(true);
  });

  it('rejects a different host and survives a malformed Origin', () => {
    expect(isSameOrigin('http://atacante.com', '10.20.10.191')).toBe(false);
    expect(isSameOrigin('no-es-una-url', '10.20.10.191')).toBe(false);
    expect(isSameOrigin('http://10.20.10.191', undefined)).toBe(false);
  });
});

describe('isOriginAllowed', () => {
  // Esta es la regresion concreta del despliegue: el navegador manda Origin en
  // todo pedido que no sea GET/HEAD, tambien cuando es del mismo origen. El
  // login es POST, asi que llegaba con Origin: http://10.20.10.191 y la
  // configuracion anterior lo rechazaba en produccion.
  it('allows a same-origin request in production, which is what the login does', () => {
    expect(isOriginAllowed('http://10.20.10.191', '10.20.10.191', production)).toBe(true);
  });

  it('allows requests without Origin (health checks, curl, same-origin GET)', () => {
    expect(isOriginAllowed(undefined, '10.20.10.191', production)).toBe(true);
  });

  it('does not depend on the host being configured anywhere', () => {
    // Cambiar la IP o el dominio del servidor no deberia requerir tocar nada.
    expect(isOriginAllowed('http://192.168.0.50', '192.168.0.50', production)).toBe(true);
    expect(isOriginAllowed('https://otra-maquina.local', 'otra-maquina.local', production)).toBe(true);
  });

  it('blocks a genuinely foreign origin in production', () => {
    expect(isOriginAllowed('http://atacante.com', '10.20.10.191', production)).toBe(false);
    expect(isOriginAllowed('http://localhost:5173', '10.20.10.191', production)).toBe(false);
  });

  it('honours the configured allowlist for a frontend on another domain', () => {
    const policy: OriginPolicy = { isProduction: true, allowedOrigins: ['https://otro.dominio'] };

    expect(isOriginAllowed('https://otro.dominio', '10.20.10.191', policy)).toBe(true);
    expect(isOriginAllowed('https://otro.dominio.falso', '10.20.10.191', policy)).toBe(false);
  });

  it('allows local hosts only outside production, so Vite can pick another port', () => {
    expect(isOriginAllowed('http://localhost:5174', 'localhost:3001', development)).toBe(true);
    expect(isOriginAllowed('http://127.0.0.1:5173', 'localhost:3001', development)).toBe(true);
    expect(isOriginAllowed('http://localhost:5174', 'localhost:3001', production)).toBe(false);
  });
});

// Estos van contra la app real, porque la mitad del problema no estaba en la
// decision sino en como se comunicaba: el paquete cors recibia un Error, lo
// derivaba a next(), y el manejador de errores respondia 500. El navegador
// mostraba "error del servidor" en vez de un problema de CORS.
describe('middleware de CORS montado en la app', () => {
  it('responde un pedido del mismo origen con la cabecera CORS', async () => {
    const response = await request(app)
      .get('/api/v1/health')
      .set('Host', '10.20.10.191')
      .set('Origin', 'http://10.20.10.191');

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe('http://10.20.10.191');
  });

  it('no convierte un origen ajeno en un 500', async () => {
    const response = await request(app)
      .get('/api/v1/health')
      .set('Host', '10.20.10.191')
      .set('Origin', 'http://atacante.com');

    expect(response.status).toBe(200);
    // Sin cabecera CORS: bloquea el navegador, que es a quien le corresponde.
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('atiende un pedido sin Origin, como el health check del deploy', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});
