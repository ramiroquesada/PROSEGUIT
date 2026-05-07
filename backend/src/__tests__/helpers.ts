import request from 'supertest';

const BASE = 'http://localhost:3001';

let cachedToken: string | null = null;
let lastLogin = 0;

export async function getAdminToken(): Promise<string> {
  // Esperar al menos 1 segundo desde el último login para evitar JWT duplicados
  const now = Date.now();
  const wait = Math.max(0, 1000 - (now - lastLogin));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));

  const res = await request(BASE)
    .post('/api/v1/auth/login')
    .send({ ficha: 9999, password: 'admin123' });

  if (res.status !== 200) {
    throw new Error(`Login failed (${res.status}): ${JSON.stringify(res.body)}`);
  }

  lastLogin = Date.now();
  cachedToken = res.body.accessToken;
  return cachedToken;
}

export async function getTecnicoToken(): Promise<string> {
  const now = Date.now();
  const wait = Math.max(0, 1000 - (now - lastLogin));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));

  const res = await request(BASE)
    .post('/api/v1/auth/login')
    .send({ ficha: 8079, password: '8079' });

  if (res.status !== 200) {
    throw new Error(`Login failed (${res.status}): ${JSON.stringify(res.body)}`);
  }

  lastLogin = Date.now();
  return res.body.accessToken;
}
