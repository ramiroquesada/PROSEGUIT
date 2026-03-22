import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const dataPath = resolve(import.meta.dirname, '..', '..', 'export_datos_v1.json');
const v1 = JSON.parse(readFileSync(dataPath, 'utf8'));

// Maps
const oficinaMap = new Map<number, number>();   // v1 ubicacion id -> v2 oficina id
const tipoMap = new Map<number, number>();      // v1 tipo id -> v2 tipo id
const usuarioByFicha = new Map<number, number>(); // ficha -> v2 usuario id
const equipoBySerie = new Map<number, number>(); // serie -> v2 equipo id
const servicioMap = new Map<number, number>();

// Map v1 observacion text -> v2 AccionTipo
function mapAccion(obs: string): string {
  const lower = (obs || '').toLowerCase().trim();
  if (lower.includes('se creo')) return 'CREACION';
  if (lower.includes('se envio al propietario')) return 'TRANSFERENCIA';
  if (lower.includes('se cambio la ubicacion')) return 'TRANSFERENCIA';
  if (lower.includes('se ingreso')) return 'RETORNO_SOPORTE';
  if (lower.includes('se envio a service')) return 'ENVIO_SERVICIO_EXTERNO';
  return 'EDICION';
}

async function migrateLocations() {
  console.log(`Migrando ${v1.ubicacion.length} ubicaciones...`);

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

    const oficina = await prisma.oficina.upsert({
      where: { nombre_seccionId: { nombre, seccionId: general.id } },
      update: { v1Id: ub.id },
      create: { nombre, seccionId: general.id, v1Id: ub.id },
    });
    oficinaMap.set(ub.id, oficina.id);
  }

  console.log(`  -> ${oficinaMap.size} oficinas creadas`);
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
        forcePasswordChange: u.ficha !== 9999,
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

  for (const eq of v1.equipo) {
    const oficinaId = oficinaMap.get(eq.ubicacion) ?? fallbackOficinaId;
    const tipoEquipoId = tipoMap.get(eq.tipo) ?? fallbackTipoId;

    try {
      const equipo = await prisma.equipo.create({
        data: {
          serie: eq.serie,
          modelo: (eq.modelo || '').trim() || null,
          tipoEquipoId,
          oficinaId,
          estado: 'ACTIVO',
          ip: String(eq.ip ?? '').trim() || null,
          urlImage: (eq.url_image || '').trim() || null,
          observacion: String(eq.observacion ?? '').trim() || null,
          v1Id: eq.id,
        },
      });
      equipoBySerie.set(eq.serie, equipo.id);
      migrated++;
    } catch (e: any) {
      if (e.code === 'P2002') {
        skipped++;
      } else {
        console.warn(`  ! Equipo serie=${eq.serie}: ${e.message?.slice(0, 80)}`);
        skipped++;
      }
    }
  }

  console.log(`  -> ${migrated} equipos migrados, ${skipped} omitidos`);
}

async function migrateHistory() {
  console.log(`Migrando ${v1.historial.length} registros de historial...`);

  // v1 historial uses: serie, ubicacion (name), fecha, observacion (action text), usuario (ficha)
  const adminId = usuarioByFicha.get(9999) ?? 1;

  // Build ubicacion name -> oficina id map
  const nombreToOficinaId = new Map<string, number>();
  for (const ub of v1.ubicacion) {
    const nombre = (ub.nombre || '').trim().toLowerCase();
    const ofId = oficinaMap.get(ub.id);
    if (ofId) nombreToOficinaId.set(nombre, ofId);
  }

  let migrated = 0;
  let skipped = 0;

  // Sort by date
  const sorted = [...v1.historial].sort((a: any, b: any) =>
    new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
  );

  for (const h of sorted) {
    const equipoId = equipoBySerie.get(h.serie);
    if (!equipoId) { skipped++; continue; }

    const accion = mapAccion(h.observacion);
    const usuarioId = usuarioByFicha.get(h.usuario) ?? adminId;

    // Try to resolve ubicacion name to oficina
    const ubNombre = (h.ubicacion || '').trim().toLowerCase();
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
    }
  }

  console.log(`  -> ${migrated} historial migrados, ${skipped} omitidos`);
}

async function migrateLoans() {
  console.log(`Migrando ${v1.prestamo.length} prestamos...`);

  const adminId = usuarioByFicha.get(9999) ?? 1;
  let migrated = 0;
  let skipped = 0;

  for (const p of v1.prestamo) {
    // v1 uses serie, not equipo_id
    const equipoId = equipoBySerie.get(p.serie);
    if (!equipoId) { skipped++; continue; }

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
    }
  }

  console.log(`  -> ${migrated} prestamos migrados, ${skipped} omitidos`);
}

async function main() {
  console.log('=== Migracion seguit v1 -> PROSEGUIT v2 ===\n');

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

  console.log(`\n=== Migracion completada ===`);
  console.log(`Equipos:     ${totalEquipos}`);
  console.log(`Historial:   ${totalHistorial}`);
  console.log(`Ubicaciones: ${totalUbicaciones}`);
  console.log(`Tipos:       ${tipoMap.size}`);
  console.log(`Usuarios:    ${usuarioByFicha.size}`);
  console.log(`Prestamos:   ${totalPrestamos}`);
}

main()
  .catch((e) => {
    console.error('Error en migracion:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
