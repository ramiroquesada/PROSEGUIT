/**
 * Pasa a Stock los equipos NUEVO que quedaron "en espera" en Mantenimiento
 * (flujo anterior al control de stock). Se corre UNA vez, a mano, después del
 * deploy que incorpora el Stock.
 *
 *   Vista previa (no cambia nada):
 *     node dist/scripts/pasar-nuevos-a-stock.js
 *   Aplicar:
 *     node dist/scripts/pasar-nuevos-a-stock.js --apply [--ficha=9999]
 *
 * Opciones:
 *   --todas-las-oficinas  Incluye también los NUEVO asignados a oficinas que no
 *                         son de Soporte (por defecto sólo los de Soporte, que
 *                         son los que no tienen destino decidido).
 *   --ficha=NNNN          Usuario que figura en el historial (por defecto, el
 *                         primer ADMIN activo).
 *
 * En desarrollo: npx tsx src/scripts/pasar-nuevos-a-stock.ts [--apply]
 */
import { prisma } from '../utils/prisma.js';
import type { AccionTipo, PrismaClient } from '@prisma/client';
import { pathToFileURL } from 'node:url';

/** Acciones que indican que el equipo ya estuvo en uso en alguna oficina. */
const ACCIONES_DE_USO: AccionTipo[] = ['ASIGNACION', 'RETORNO_SOPORTE', 'PRESTAMO', 'DEVOLUCION'];

const MOTIVO = 'Pasaje a Stock: equipo nuevo sin asignar (flujo anterior al control de stock)';

export interface Candidato {
  id: number;
  serie: number;
  tipo: string;
  modelo: string | null;
  oficinaId: number;
  oficinaAsignadaId: number;
  oficinaAsignada: string;
  createdAt: Date;
}

export interface Excluido extends Candidato {
  motivo: string;
}

export interface Plan {
  stock: { id: number; nombre: string };
  mover: Candidato[];
  revisar: Excluido[];
}

export async function planificar(db: PrismaClient, opts: { todasLasOficinas: boolean }): Promise<Plan> {
  const stock = await db.oficina.findFirst({ where: { tipo: 'STOCK' }, select: { id: true, nombre: true } });
  if (!stock) throw new Error('No hay una oficina de Stock. ¿Se aplicaron las migraciones?');

  const equipos = await db.equipo.findMany({
    where: { estado: 'NUEVO', oficina: { tipo: 'MANTENIMIENTO' } },
    select: {
      id: true,
      serie: true,
      modelo: true,
      oficinaId: true,
      oficinaAsignadaId: true,
      createdAt: true,
      tipoEquipo: { select: { nombre: true } },
      oficinaAsignada: { select: { nombre: true, tipo: true } },
      historial: {
        where: { accion: { in: ACCIONES_DE_USO } },
        select: { accion: true },
      },
    },
    orderBy: { serie: 'asc' },
  });

  const plan: Plan = { stock, mover: [], revisar: [] };
  for (const e of equipos) {
    const c: Candidato = {
      id: e.id,
      serie: e.serie,
      tipo: e.tipoEquipo.nombre,
      modelo: e.modelo,
      oficinaId: e.oficinaId,
      oficinaAsignadaId: e.oficinaAsignadaId,
      oficinaAsignada: e.oficinaAsignada.nombre,
      createdAt: e.createdAt,
    };

    if (e.historial.length > 0) {
      const acciones = [...new Set(e.historial.map((h) => h.accion))].join(', ');
      plan.revisar.push({ ...c, motivo: `Su historial indica uso previo (${acciones})` });
    } else if (e.oficinaAsignada.tipo !== 'SOPORTE' && !opts.todasLasOficinas) {
      plan.revisar.push({ ...c, motivo: `Tiene otra oficina asignada (${e.oficinaAsignada.nombre}); puede tener destino decidido` });
    } else {
      plan.mover.push(c);
    }
  }
  return plan;
}

export async function aplicar(db: PrismaClient, plan: Plan, usuarioId: number) {
  if (plan.mover.length === 0) return 0;

  await db.$transaction(async (tx) => {
    for (const c of plan.mover) {
      // Condición extra: si alguien movió el equipo entre la vista previa y
      // ahora, se cancela todo en lugar de pisar ese cambio.
      const res = await tx.equipo.updateMany({
        where: { id: c.id, estado: 'NUEVO', oficinaId: c.oficinaId, oficinaAsignadaId: c.oficinaAsignadaId },
        data: {
          oficinaId: plan.stock.id,
          oficinaAsignadaId: plan.stock.id,
          stockEtapa: 'LISTO',
          // Los días en stock cuentan desde el alta del equipo.
          stockDesde: c.createdAt,
        },
      });
      if (res.count !== 1) {
        throw new Error(`El equipo serie ${c.serie} cambió durante el proceso. No se movió ningún equipo; volvé a correr la vista previa.`);
      }
      await tx.historial.create({
        data: {
          equipoId: c.id,
          accion: 'TRANSFERENCIA',
          oficinaOrigenId: c.oficinaAsignadaId,
          oficinaDestinoId: plan.stock.id,
          usuarioId,
          motivo: MOTIVO,
          metadata: {
            script: 'pasar-nuevos-a-stock',
            oficinaActualAnteriorId: c.oficinaId,
            oficinaAsignadaAnteriorId: c.oficinaAsignadaId,
          },
        },
      });
    }
  }, { timeout: 120_000 });

  return plan.mover.length;
}

function linea(c: Candidato) {
  return `  serie ${String(c.serie).padEnd(7)} ${c.tipo.padEnd(18).slice(0, 18)} ${(c.modelo ?? '—').padEnd(28).slice(0, 28)} asignada: ${c.oficinaAsignada}`;
}

async function resolverUsuario(db: PrismaClient): Promise<{ id: number; nombre: string; ficha: number }> {
  const arg = process.argv.find((a) => a.startsWith('--ficha='));
  if (arg) {
    const ficha = Number(arg.split('=')[1]);
    const u = await db.usuario.findUnique({ where: { ficha }, select: { id: true, nombre: true, ficha: true } });
    if (!u) throw new Error(`No existe un usuario con ficha ${ficha}`);
    return u;
  }
  const admin = await db.usuario.findFirst({
    where: { rol: 'ADMIN', activo: true },
    orderBy: { id: 'asc' },
    select: { id: true, nombre: true, ficha: true },
  });
  if (!admin) throw new Error('No hay un usuario ADMIN activo; indicá uno con --ficha=NNNN');
  return admin;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const todasLasOficinas = process.argv.includes('--todas-las-oficinas');

  const plan = await planificar(prisma, { todasLasOficinas });

  console.log(`Oficina de Stock: ${plan.stock.nombre} (id ${plan.stock.id})`);
  console.log(`Criterio: NUEVO en Mantenimiento, sin uso previo en el historial, ${todasLasOficinas ? 'cualquier oficina asignada' : 'asignados a Soporte'}.\n`);

  console.log(`SE MOVERÍAN A STOCK (Nuevo · Listo): ${plan.mover.length}`);
  plan.mover.forEach((c) => console.log(linea(c)));

  console.log(`\nQUEDAN AFUERA, REVISAR A MANO: ${plan.revisar.length}`);
  plan.revisar.forEach((c) => console.log(`${linea(c)}\n      → ${c.motivo}`));

  if (!apply) {
    console.log('\nVista previa: no se modificó nada. Para aplicar, volvé a correr con --apply');
    return;
  }

  const usuario = await resolverUsuario(prisma);
  const movidos = await aplicar(prisma, plan, usuario.id);
  console.log(`\nListo: ${movidos} equipo(s) pasados a Stock. Historial a nombre de ${usuario.nombre} (ficha ${usuario.ficha}).`);
}

const isDirectExecution = process.argv[1]
  ? pathToFileURL(process.argv[1]).href === import.meta.url
  : false;

if (isDirectExecution) {
  main()
    .catch((error) => {
      console.error('\nERROR:', error instanceof Error ? error.message : error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
