import { Prisma, PrismaClient, type TipoOficina } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { execSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';
import { auditData } from '../src/scripts/audit-data.js';

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const backendDir = resolve(import.meta.dirname, '..');
const dataPath = resolve(import.meta.dirname, '..', '..', 'export_datos_v1.json');
let v1: any;

async function preflight() {
  // 1. Verificar que el JSON de datos existe
  if (!existsSync(dataPath)) {
    console.error('ERROR: export_datos_v1.json no encontrado.');
    console.error('  Correr primero: node extract_data.js');
    process.exit(1);
  }

  // 2. Verificar conexión a la DB
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    console.error('ERROR: No se puede conectar a la base de datos.');
    console.error('  Correr primero: npm run db:up');
    process.exit(1);
  }

  // 3. Detectar y reparar migración incompleta (estado_equipo_old)
  //    Ocurre cuando remove_baja_estado renombró el enum pero no completó el ALTER TABLE.
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM pg_type WHERE typname = 'estado_equipo_old'
    ) AS exists
  `;
  if (rows[0]?.exists) {
    console.log('⚠  Migración incompleta detectada (estado_equipo_old). Reparando...');
    await prisma.$executeRaw`ALTER TABLE "equipo" ALTER COLUMN "estado" DROP DEFAULT`;
    await prisma.$executeRaw`ALTER TABLE "equipo" ALTER COLUMN "estado" TYPE "estado_equipo" USING "estado"::text::"estado_equipo"`;
    await prisma.$executeRaw`ALTER TABLE "equipo" ALTER COLUMN "estado" SET DEFAULT 'ACTIVO'::"estado_equipo"`;
    await prisma.$executeRaw`DROP TYPE "estado_equipo_old"`;
    // Marcar la migración fallida como aplicada en el historial de Prisma
    await prisma.$executeRaw`
      UPDATE "_prisma_migrations"
      SET finished_at = NOW(), logs = NULL
      WHERE migration_name = '20260328210000_remove_baja_estado'
        AND finished_at IS NULL
    `;
    console.log('   -> Reparado.\n');
  }

  // 4. Aplicar migraciones pendientes
  console.log('Verificando migraciones...');
  try {
    // Intentar migrate deploy primero (si la tabla _prisma_migrations existe)
    // Si falla porque no existe la tabla, usar db push (DB ya está en sync)
    try {
      execSync('npx prisma migrate deploy', { stdio: 'pipe', cwd: backendDir });
      console.log('   Migraciones aplicadas con migrate deploy');
    } catch (deployError: any) {
      if (deployError.message?.includes('_prisma_migrations') ||
          deployError.toString()?.includes('baseline')) {
        // DB ya está en sync (usamos db push en setup inicial)
        console.log('   DB ya está sincronizada (sin tabla de migrations)');
        execSync('npx prisma db push --accept-data-loss', { stdio: 'pipe', cwd: backendDir });
      } else {
        throw deployError;
      }
    }
  } catch {
    console.error('ERROR: No se pudieron aplicar las migraciones. Revisar el estado de la DB.');
    process.exit(1);
  }

  // 5. Regenerar Prisma Client para reflejar el schema actual
  execSync('npx prisma generate', { stdio: 'pipe', cwd: backendDir });
  console.log('');
}
// Maps
const oficinaMap = new Map<number, number>();   // v1 ubicacion id -> v2 oficina id
const oficinaByName = new Map<string, number>(); // nombre v1 -> v2 oficina id
const tipoMap = new Map<number, number>();      // v1 tipo id -> v2 tipo id
const usuarioByFicha = new Map<number, number>(); // ficha -> v2 usuario id
const equipoBySerie = new Map<number, number>(); // serie -> v2 equipo id
const servicioMap = new Map<number, number>();

interface MigrationAnomaly {
  code: string;
  severity: 'error' | 'warning' | 'info';
  description: string;
  count: number;
  sample: unknown[];
}

const migrationAnomalies: MigrationAnomaly[] = [];

function registerMigrationAnomaly(anomaly: MigrationAnomaly) {
  if (anomaly.count > 0) migrationAnomalies.push(anomaly);
}

function normalizeLocationName(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

// Map v1 observacion text -> v2 AccionTipo
function mapAccion(obs: string): string {
  const lower = (obs || '').toLowerCase().trim();
  if (lower.includes('se creo')) return 'CREACION';
  if (lower.includes('se envio al propietario')) return 'ASIGNACION';
  if (lower.includes('se cambio la ubicacion')) return 'TRANSFERENCIA';
  if (lower.includes('se ingreso')) return 'ENVIO_SOPORTE';
  if (lower.includes('se envio a service')) return 'ENVIO_SERVICIO_EXTERNO';
  return 'EDICION';
}

async function migrateLocations() {
  console.log(`Migrando ${v1.ubicacion.length} ubicaciones...`);

  const locationsByName = new Map<string, Array<{ id: number; nombre: string }>>();
  for (const sourceLocation of v1.ubicacion) {
    const normalizedName = String(sourceLocation.nombre || '').trim();
    if (!normalizedName) continue;
    const key = normalizeLocationName(normalizedName);
    const group = locationsByName.get(key) ?? [];
    group.push({ id: sourceLocation.id, nombre: normalizedName });
    locationsByName.set(key, group);
  }
  const locationCollisions = [...locationsByName.values()]
    .filter((group) => group.length > 1)
    .map((group) => ({ nombre: group[0].nombre, v1Ids: group.map((location) => location.id) }));

  registerMigrationAnomaly({
    code: 'MIGRATION_LOCATION_NAME_COLLISION',
    severity: 'warning',
    description: 'Ubicaciones de SEGUIT v1 con el mismo nombre se consolidaron en una oficina.',
    count: locationCollisions.length,
    sample: locationCollisions.slice(0, 25),
  });

  const mercedes = await prisma.ciudad.upsert({
    where: { nombre: 'Mercedes' },
    update: {},
    create: { nombre: 'Mercedes' },
  });

  const general = await prisma.seccion.upsert({
    where: { nombre_ciudadId: { nombre: 'General', ciudadId: mercedes.id } },
    update: {},
    create: { nombre: 'General', ciudadId: mercedes.id },
  });

  for (const ub of v1.ubicacion) {
    const nombre = (ub.nombre || '').trim();
    if (!nombre) continue;

    const nombreLower = normalizeLocationName(nombre);
    let tipo: TipoOficina = 'OFICINA';
    if (nombreLower === 'mantenimiento') {
      tipo = 'MANTENIMIENTO';
    } else if (nombreLower.includes('soporte')) {
      tipo = 'SOPORTE';
    } else if (nombreLower === 'deposito') {
      tipo = 'DEPOSITO';
    }

    const oficina = await prisma.oficina.upsert({
      where: { nombre_seccionId: { nombre, seccionId: general.id } },
      update: { v1Id: ub.id, tipo },
      create: { nombre, seccionId: general.id, v1Id: ub.id, tipo },
    });
    oficinaMap.set(ub.id, oficina.id);
    oficinaByName.set(normalizeLocationName(nombre), oficina.id);
  }

  // SEGUIT 1 usaba "Mantenimiento" como ubicación temporal en equipo.ubicacion_tmp,
  // pero no la incluía en su tabla formal de ubicaciones. En v2 es una ubicación
  // lógica explícita: allí quedan los equipos entre ENTRADA y SALIDA.
  const mantenimiento = await prisma.oficina.upsert({
    where: { nombre_seccionId: { nombre: 'Mantenimiento', seccionId: general.id } },
    update: { tipo: 'MANTENIMIENTO' },
    create: { nombre: 'Mantenimiento', seccionId: general.id, tipo: 'MANTENIMIENTO' },
  });
  oficinaByName.set(normalizeLocationName(mantenimiento.nombre), mantenimiento.id);

  const resultingOfficeCount = new Set(oficinaMap.values()).size;
  console.log(`  -> ${resultingOfficeCount + 1} oficinas resultantes para ${oficinaMap.size} referencias de v1 y Mantenimiento`);
}

async function migrateTypes() {
  console.log(`Migrando ${v1.tipo.length} tipos de equipo...`);

  for (const tipo of v1.tipo) {
    const t = await prisma.tipoEquipo.upsert({
      where: { nombre: tipo.nombre.trim() },
      update: { v1Id: tipo.id },
      create: { nombre: tipo.nombre.trim(), v1Id: tipo.id },
    });
    tipoMap.set(tipo.id, t.id);
  }

  console.log(`  -> ${tipoMap.size} tipos creados`);
}

async function migrateUsers() {
  console.log(`Migrando ${v1.usuario.length} usuarios...`);

  const defaultOficinaId = oficinaMap.get(1) ?? 1;

  for (const u of v1.usuario) {
    const hash = await bcrypt.hash(String(u.ficha), 12);
    const usuario = await prisma.usuario.upsert({
      where: { ficha: u.ficha },
      update: { v1Id: u.id, nombre: u.nombre.trim() },
      create: {
        nombre: u.nombre.trim(),
        ficha: u.ficha,
        passwordHash: hash,
        rol: u.rol === 1 ? 'ADMIN' : 'TECNICO',
        activo: true,
        oficinaId: defaultOficinaId,
        v1Id: u.id,
      },
    });
    usuarioByFicha.set(u.ficha, usuario.id);
  }

  console.log(`  -> ${usuarioByFicha.size} usuarios migrados`);
}

async function migrateFuncionarios() {
  console.log(`Migrando ${v1.funcionarios.length} funcionarios...`);

  let count = 0;
  for (const f of v1.funcionarios) {
    const ficha = f.ficha ?? 0;
    try {
      await prisma.funcionario.upsert({
        where: { ficha },
        update: {},
        create: { ficha, nombre: (f.nombre || '').trim(), activo: true },
      });
      count++;
    } catch (e: any) {
      console.warn(`  ! Funcionario ficha ${ficha}: ${e.message?.slice(0, 60)}`);
    }
  }

  console.log(`  -> ${count} funcionarios migrados`);
}

async function migrateServices() {
  console.log(`Migrando ${v1.servicio.length} servicios externos...`);

  for (const s of v1.servicio) {
    const svc = await prisma.servicioExterno.create({
      data: { nombre: s.nombre.trim(), activo: true },
    });
    servicioMap.set(s.id, svc.id);
  }

  console.log(`  -> ${servicioMap.size} servicios creados`);
}

async function migrateEquipment() {
  console.log(`Migrando ${v1.equipo.length} equipos...`);

  const fallbackOficinaId = oficinaMap.get(1) ?? 1;
  const fallbackTipoId = tipoMap.values().next().value ?? 1;

  let migrated = 0;
  let skipped = 0;
  let duplicateSeries = 0;
  let missingCurrentLocation = 0;
  const duplicateSamples: unknown[] = [];
  const errorSamples: unknown[] = [];
  const missingCurrentLocationSamples: unknown[] = [];

  for (const eq of v1.equipo) {
    const oficinaAsignadaId = oficinaMap.get(eq.ubicacion) ?? fallbackOficinaId;
    const currentLocationName = normalizeLocationName(eq.ubicacion_tmp);
    const oficinaId = oficinaByName.get(currentLocationName) ?? oficinaAsignadaId;
    if (currentLocationName && !oficinaByName.has(currentLocationName)) {
      missingCurrentLocation++;
      if (missingCurrentLocationSamples.length < 25) {
        missingCurrentLocationSamples.push({ v1Id: eq.id, serie: eq.serie, ubicacionTmp: eq.ubicacion_tmp });
      }
    }
    const tipoEquipoId = tipoMap.get(eq.tipo) ?? fallbackTipoId;
    const currentOfficeName = [...oficinaByName.entries()].find(([, id]) => id === oficinaId)?.[0] ?? '';
    const estado = currentOfficeName === 'mantenimiento'
      ? 'EN_REPARACION'
      : currentOfficeName === 'deposito'
        ? 'EN_DEPOSITO'
        : 'ACTIVO';

    try {
      const equipo = await prisma.equipo.create({
        data: {
          serie: eq.serie,
          modelo: (eq.modelo || '').trim() || null,
          tipoEquipoId,
          oficinaId,
          oficinaAsignadaId,
          estado,
          ip: String(eq.ip ?? '').trim() || null,
          observacion: String(eq.observacion ?? '').trim() || null,
          v1Id: eq.id,
        },
      });
      equipoBySerie.set(eq.serie, equipo.id);
      migrated++;
    } catch (e: any) {
      if (e.code === 'P2002') {
        duplicateSeries++;
        skipped++;
        if (duplicateSamples.length < 25) duplicateSamples.push({ v1Id: eq.id, serie: eq.serie });
      } else {
        console.warn(`  ! Equipo serie=${eq.serie}: ${e.message?.slice(0, 80)}`);
        skipped++;
        if (errorSamples.length < 25) errorSamples.push({ v1Id: eq.id, serie: eq.serie });
      }
    }
  }

  console.log(`  -> ${migrated} equipos migrados, ${skipped} omitidos`);
  if (duplicateSeries > 0) {
    console.log(`     (${duplicateSeries} series duplicadas en v1)`);
  }

  registerMigrationAnomaly({
    code: 'MIGRATION_EQUIPMENT_DUPLICATE_SERIES_SKIPPED',
    severity: 'error',
    description: 'Equipos omitidos porque la serie ya había sido importada.',
    count: duplicateSeries,
    sample: duplicateSamples,
  });
  registerMigrationAnomaly({
    code: 'MIGRATION_EQUIPMENT_CURRENT_LOCATION_NOT_FOUND',
    severity: 'warning',
    description: 'Equipos cuya ubicación temporal no coincidió con una oficina; se usó la oficina asignada como ubicación actual.',
    count: missingCurrentLocation,
    sample: missingCurrentLocationSamples,
  });
  registerMigrationAnomaly({
    code: 'MIGRATION_EQUIPMENT_CREATE_FAILED',
    severity: 'error',
    description: 'Equipos que no pudieron crearse por un error distinto a serie duplicada.',
    count: skipped - duplicateSeries,
    sample: errorSamples,
  });
}

async function migrateHistory() {
  console.log(`Migrando ${v1.historial.length} registros de historial...`);

  // v1 historial uses: serie, ubicacion (name), fecha, observacion (action text), usuario (ficha)
  const adminId = usuarioByFicha.get(9999) ?? 1;

  // Build ubicacion name -> oficina id map
  const nombreToOficinaId = new Map<string, number>();
  for (const ub of v1.ubicacion) {
    const nombre = normalizeLocationName(ub.nombre);
    const ofId = oficinaMap.get(ub.id);
    if (ofId) nombreToOficinaId.set(nombre, ofId);
  }

  let migrated = 0;
  let skipped = 0;
  const skippedReasons: { [key: string]: number } = { 'equipo no encontrado': 0, 'error al crear': 0 };
  const missingEquipmentSamples: unknown[] = [];
  const createErrorSamples: unknown[] = [];

  // Sort by date
  const sorted = [...v1.historial].sort((a: any, b: any) =>
    new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
  );

  for (const h of sorted) {
    const equipoId = equipoBySerie.get(h.serie);
    if (!equipoId) {
      skipped++;
      skippedReasons['equipo no encontrado']++;
      if (missingEquipmentSamples.length < 25) {
        missingEquipmentSamples.push({ v1Id: h.id, serie: h.serie });
      }
      continue;
    }

    const accion = mapAccion(h.observacion);
    const usuarioId = usuarioByFicha.get(h.usuario) ?? adminId;

    // Try to resolve ubicacion name to oficina
    const ubNombre = normalizeLocationName(h.ubicacion);
    const oficinaDestinoId = nombreToOficinaId.get(ubNombre) ?? null;

    try {
      await prisma.historial.create({
        data: {
          equipoId,
          accion: accion as any,
          oficinaDestinoId,
          usuarioId,
          motivo: String(h.observacion || '').trim() || 'Migrado de seguit v1',
          comentario: (h.comentario || '').trim() || null,
          fecha: new Date(h.fecha),
        },
      });
      migrated++;
    } catch (e: any) {
      skipped++;
      skippedReasons['error al crear']++;
      if (createErrorSamples.length < 25) {
        createErrorSamples.push({ v1Id: h.id, serie: h.serie });
      }
    }
  }

  console.log(`  -> ${migrated} historial migrados, ${skipped} omitidos`);
  if (skipped > 0) {
    console.log(`     Razones: ${Object.entries(skippedReasons).map(([k, v]) => v > 0 ? `${v} ${k}` : '').filter(Boolean).join(', ')}`);
  }

  registerMigrationAnomaly({
    code: 'MIGRATION_HISTORY_EQUIPMENT_NOT_FOUND',
    severity: 'error',
    description: 'Registros de historial omitidos porque su serie no existe entre los equipos importados.',
    count: skippedReasons['equipo no encontrado'],
    sample: missingEquipmentSamples,
  });
  registerMigrationAnomaly({
    code: 'MIGRATION_HISTORY_CREATE_FAILED',
    severity: 'error',
    description: 'Registros de historial que no pudieron crearse.',
    count: skippedReasons['error al crear'],
    sample: createErrorSamples,
  });
}

async function migrateLoans() {
  console.log(`Migrando ${v1.prestamo.length} prestamos...`);

  const adminId = usuarioByFicha.get(9999) ?? 1;
  let migrated = 0;
  let skipped = 0;
  let missingEquipment = 0;
  let createFailed = 0;
  const missingEquipmentSamples: unknown[] = [];
  const createErrorSamples: unknown[] = [];

  for (const p of v1.prestamo) {
    // v1 uses serie, not equipo_id
    const equipoId = equipoBySerie.get(p.serie);
    if (!equipoId) {
      skipped++;
      missingEquipment++;
      if (missingEquipmentSamples.length < 25) {
        missingEquipmentSamples.push({ v1Id: p.id, serie: p.serie });
      }
      continue;
    }

    const solicitanteFicha = p.solicitante ?? 0;
    const tecnicoFicha = p.tecnico ?? 9999;

    // Ensure funcionario exists
    try {
      await prisma.funcionario.upsert({
        where: { ficha: solicitanteFicha },
        update: {},
        create: { ficha: solicitanteFicha, nombre: `Funcionario ${solicitanteFicha}`, activo: true },
      });
    } catch { /* exists */ }

    // Ensure devuelto por funcionario exists
    if (p.func_dev && p.func_dev > 0) {
      try {
        await prisma.funcionario.upsert({
          where: { ficha: p.func_dev },
          update: {},
          create: { ficha: p.func_dev, nombre: `Funcionario ${p.func_dev}`, activo: true },
        });
      } catch { /* exists */ }
    }

    const oficinaDestinoId = p.ubicacion ? (oficinaMap.get(p.ubicacion) ?? oficinaMap.get(1) ?? 1) : (oficinaMap.get(1) ?? 1);
    const tecnicoId = usuarioByFicha.get(tecnicoFicha) ?? adminId;

    // Check if devolucion date is valid (not 1900-01-01)
    const fechaDev = p.fec_dev && p.fec_dev !== '1900-01-01' ? new Date(p.fec_dev) : null;
    const isActive = !fechaDev;

    // Resolve recibido por (tecnico devolucion)
    const recibidoPorId = p.tec_dev && p.tec_dev > 0
      ? (usuarioByFicha.get(p.tec_dev) ?? null)
      : null;

    try {
      await prisma.prestamo.create({
        data: {
          equipoId,
          oficinaDestinoId,
          solicitanteFicha,
          tecnicoId,
          fechaPrestamo: p.fec_pres ? new Date(p.fec_pres) : new Date(),
          fechaDevolucion: fechaDev,
          devueltoPorFicha: fechaDev && p.func_dev && p.func_dev > 0 ? p.func_dev : null,
          recibidoPorId: fechaDev ? recibidoPorId : null,
          activo: isActive,
          motivo: null,
        },
      });
      migrated++;
    } catch (e: any) {
      console.warn(`  ! Prestamo serie=${p.serie}: ${e.message?.slice(0, 80)}`);
      skipped++;
      createFailed++;
      if (createErrorSamples.length < 25) {
        createErrorSamples.push({ v1Id: p.id, serie: p.serie });
      }
    }
  }

  console.log(`  -> ${migrated} prestamos migrados, ${skipped} omitidos`);

  registerMigrationAnomaly({
    code: 'MIGRATION_LOAN_EQUIPMENT_NOT_FOUND',
    severity: 'error',
    description: 'Préstamos omitidos porque su serie no existe entre los equipos importados.',
    count: missingEquipment,
    sample: missingEquipmentSamples,
  });
  registerMigrationAnomaly({
    code: 'MIGRATION_LOAN_CREATE_FAILED',
    severity: 'error',
    description: 'Préstamos que no pudieron crearse.',
    count: createFailed,
    sample: createErrorSamples,
  });
}

async function main() {
  console.log('=== Migracion seguit v1 -> PROSEGUIT v2 ===\n');

  await preflight();

  const sourceContents = readFileSync(dataPath, 'utf8');
  v1 = JSON.parse(sourceContents);
  const sourceHash = createHash('sha256').update(sourceContents).digest('hex');
  const executionId = randomUUID();
  const exportedDate = v1._meta?.exported ? new Date(v1._meta.exported) : null;
  const exportadoAt = exportedDate && !Number.isNaN(exportedDate.getTime()) ? exportedDate : null;

  await prisma.ejecucionMigracion.create({
    data: {
      id: executionId,
      origen: 'SEGUIT_V1',
      archivoFuente: v1._meta?.source || 'export_datos_v1.json',
      huellaFuente: sourceHash,
      exportadoAt,
      estado: 'EN_PROCESO',
    },
  });

  console.log(`Ejecución registrada: ${executionId}`);
  console.log(`Huella SHA-256 de entrada: ${sourceHash}\n`);

  try {
    console.log('Limpiando datos existentes...');
    await prisma.historial.deleteMany();
    await prisma.prestamo.deleteMany();
    await prisma.envioServicio.deleteMany();
    await prisma.equipo.deleteMany();
    await prisma.funcionario.deleteMany();
    await prisma.servicioExterno.deleteMany();
    await prisma.tipoEquipo.deleteMany();
    await prisma.oficina.deleteMany({ where: { v1Id: { not: null } } });
    console.log('Datos limpiados.\n');

    await migrateLocations();
    await migrateTypes();
    await migrateUsers();
    await migrateFuncionarios();
    await migrateServices();
    await migrateEquipment();
    await migrateHistory();
    await migrateLoans();

    const totalEquipos = await prisma.equipo.count();
    const totalHistorial = await prisma.historial.count();
    const totalUbicaciones = await prisma.oficina.count();
    const totalPrestamos = await prisma.prestamo.count();

    const audit = await auditData(prisma);
    const findings = [
      ...migrationAnomalies,
      ...audit.findings.filter((item) => item.count > 0),
    ];

    if (findings.length > 0) {
      await prisma.anomaliaMigracion.createMany({
        data: findings.map((item) => ({
          ejecucionId: executionId,
          codigo: item.code,
          severidad: item.severity.toUpperCase(),
          descripcion: item.description,
          cantidad: item.count,
          muestra: item.sample as Prisma.InputJsonValue,
          estado: item.severity === 'info' ? 'INFORMATIVA' : 'A_REVISAR',
        })),
      });
    }

    await prisma.ejecucionMigracion.update({
      where: { id: executionId },
      data: {
        estado: audit.summary.errorGroups > 0 ? 'COMPLETADA_CON_ANOMALIAS' : 'COMPLETADA',
        finalizadaAt: new Date(),
        resumen: {
          equipos: totalEquipos,
          historial: totalHistorial,
          ubicaciones: totalUbicaciones,
          tipos: tipoMap.size,
          usuarios: usuarioByFicha.size,
          prestamos: totalPrestamos,
          auditoria: audit.summary,
        },
      },
    });

    console.log(`\n=== Migracion completada ===`);
    console.log(`Equipos:     ${totalEquipos}`);
    console.log(`Historial:   ${totalHistorial}`);
    console.log(`Ubicaciones: ${totalUbicaciones}`);
    console.log(`Tipos:       ${tipoMap.size}`);
    console.log(`Usuarios:    ${usuarioByFicha.size}`);
    console.log(`Prestamos:   ${totalPrestamos}`);
    console.log(`Anomalías:   ${findings.length} grupos registrados`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    await prisma.ejecucionMigracion.update({
      where: { id: executionId },
      data: {
        estado: 'FALLIDA',
        finalizadaAt: new Date(),
        resumen: { error: errorMessage.slice(0, 500) },
      },
    });
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('Error en migracion:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
