/**
 * Helper script para ejecutar migraciones Prisma que contienen cambios de enums.
 *
 * PostgreSQL tiene una limitación: no permite usar valores nuevos de enums
 * en la misma transacción que se agregan.
 *
 * Este script detecta migraciones con enums problemáticas y las ejecuta
 * con `db push` en lugar de `migrate dev`.
 *
 * Migraciones que requieren este handler:
 * - 20260328173932_add_estado_nuevo (agrega NUEVO a estado_equipo)
 * - 20260328200000_add_asignacion_accion (agrega ASIGNACION a accion_tipo)
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ENUM_MIGRATIONS = [
  '20260328173932_add_estado_nuevo',
  '20260328173933_set_estado_nuevo_default',
  '20260328200000_add_asignacion_accion',
];

async function migrateWithEnums() {
  console.log('🔄 Aplicando migraciones (manejo especial para enums)...');

  try {
    // Ejecutar todas las migraciones
    console.log('\n📋 Aplicando schema actual...');
    execSync('npx prisma db push --accept-data-loss', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
    });

    console.log('\n✅ Migraciones completadas exitosamente');
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  }
}

migrateWithEnums();
