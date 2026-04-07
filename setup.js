#!/usr/bin/env node

/**
 * PROSEGUIT Setup Script
 * Crea .env, instala dependencias, levanta DB y aplica migraciones
 *
 * Uso: node setup.js
 */

import { existsSync, copyFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

const log = {
  header: (text) => console.log(`\n${colors.green}${text}${colors.reset}`),
  step: (text) => console.log(`${colors.cyan}${text}${colors.reset}`),
  success: (text) => console.log(`${colors.green}✅ ${text}${colors.reset}`),
  info: (text) => console.log(`${colors.yellow}ℹ️  ${text}${colors.reset}`),
  error: (text) => console.error(`${colors.red}❌ ${text}${colors.reset}`),
};

async function setup() {
  try {
    log.header('🚀 PROSEGUIT v2 - Setup');

    // 1. Crear .env si no existe
    const envPath = path.join(__dirname, '.env');
    const envExamplePath = path.join(__dirname, '.env.example');

    if (!existsSync(envPath)) {
      log.step('📋 Creando .env desde .env.example...');
      copyFileSync(envExamplePath, envPath);
      log.success('.env creado');
    } else {
      log.info('.env ya existe');
    }

    // 2. Crear .env en backend si no existe
    const backendEnvPath = path.join(__dirname, 'backend', '.env');
    if (!existsSync(backendEnvPath)) {
      log.step('📋 Creando backend/.env...');
      copyFileSync(envPath, backendEnvPath);
      log.success('backend/.env creado');
    } else {
      log.info('backend/.env ya existe');
    }

    // 3. npm install
    log.step('\n📦 Instalando dependencias...');
    execSync('npm install', { stdio: 'inherit', cwd: __dirname });
    log.success('Dependencias instaladas');

    // 4. Levantar DB
    log.step('\n🐘 Levantando PostgreSQL...');
    execSync('npm run db:up', { stdio: 'inherit', cwd: __dirname });
    log.step('   ⏳ Esperando a que PostgreSQL esté listo...');
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 5. Migraciones
    log.step('\n🔄 Aplicando migraciones...');
    execSync('npm run db:migrate', { stdio: 'inherit', cwd: __dirname });
    log.success('Migraciones aplicadas');

    // 6. Seed
    log.step('\n🌱 Cargando usuarios iniciales...');
    execSync('npm run db:seed', { stdio: 'inherit', cwd: __dirname });
    log.success('Base de datos lista');

    // Success!
    log.header('✅ Setup completado!');

    console.log(`
${colors.cyan}Próximos pasos:${colors.reset}
  npm run dev              # Iniciar backend + frontend

${colors.cyan}Con datos de seguit v1:${colors.reset}
  1. Copiar db_seguit1.sql a la raíz
  2. npm run migrate:v1

${colors.cyan}URLs:${colors.reset}
  Frontend:  http://localhost:5173
  Backend:   http://localhost:3001

${colors.cyan}Credenciales:${colors.reset}
  Admin:     9999 / admin123
  Técnico:   7844 / 7844
`);
  } catch (error) {
    log.error(`Error durante setup: ${error.message}`);
    process.exit(1);
  }
}

setup();
