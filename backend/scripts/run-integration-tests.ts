import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import dotenv from 'dotenv';
import pg from 'pg';

const { Client } = pg;
const backendDir = resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const prismaCli = require.resolve('prisma/build/index.js');
const tsxCli = require.resolve('tsx/cli');
const vitestCli = resolve(dirname(require.resolve('vitest/package.json')), 'vitest.mjs');

dotenv.config({ path: resolve(backendDir, '.env'), quiet: true });

const sourceDatabaseUrl = process.env.DATABASE_URL;
if (!sourceDatabaseUrl) {
  throw new Error('DATABASE_URL es obligatoria para crear la base aislada de QA');
}

const databaseName = `proseguit_test_${Date.now()}_${process.pid}`;
if (!/^proseguit_test_[0-9_]+$/.test(databaseName)) {
  throw new Error('Nombre de base de QA inválido');
}

const testUrl = new URL(sourceDatabaseUrl);
testUrl.pathname = `/${databaseName}`;

const adminUrl = new URL(sourceDatabaseUrl);
adminUrl.pathname = '/postgres';

const testEnv: NodeJS.ProcessEnv = {
  ...process.env,
  NODE_ENV: 'test',
  DATABASE_URL: testUrl.toString(),
  JWT_SECRET: 'qa-access-secret-for-isolated-tests',
  JWT_REFRESH_SECRET: 'qa-refresh-secret-for-isolated-tests',
  JWT_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '1d',
};

function run(label: string, cli: string, args: string[]) {
  console.log(`\n[QA] ${label}`);
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: backendDir,
    env: testEnv,
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${label} terminó con código ${result.status ?? 'desconocido'}`);
  }
}

const admin = new Client({ connectionString: adminUrl.toString() });
let adminConnected = false;
let databaseCreated = false;

try {
  await admin.connect();
  adminConnected = true;
  await admin.query(`CREATE DATABASE "${databaseName}"`);
  databaseCreated = true;
  console.log(`[QA] Base temporal creada: ${databaseName}`);

  run('Aplicando migraciones', prismaCli, ['migrate', 'deploy']);
  run('Cargando fixtures mínimos', tsxCli, ['prisma/seed-test.ts']);
  run('Ejecutando pruebas de integración', vitestCli, [
    'run',
    'src/__tests__',
    '--maxWorkers=1',
    '--no-file-parallelism',
  ]);
} catch (error) {
  console.error('\n[QA] La ejecución falló:', error);
  process.exitCode = 1;
} finally {
  if (adminConnected) {
    try {
      if (databaseCreated) {
        await admin.query(
          'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()',
          [databaseName],
        );
        await admin.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
        console.log(`[QA] Base temporal eliminada: ${databaseName}`);
      }
    } finally {
      await admin.end();
    }
  }
}
