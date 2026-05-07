import { prisma } from '../../utils/prisma.js';
import { EstadoEquipo } from '@prisma/client';

// NUEVO, PRESTADO y EN_SERVICIO_EXTERNO son estados reales en DB (no derivados de oficina)
const ESTADOS_ESPECIALES: EstadoEquipo[] = ['NUEVO', 'PRESTADO', 'EN_SERVICIO_EXTERNO'];

export async function getStats() {
  const [
    totalEquipos,
    equiposNuevos,
    enDeposito,
    enReparacion,
    enServicioExterno,
    prestamosActivos,
    totalOficinas,
  ] = await Promise.all([
    prisma.equipo.count(),
    prisma.equipo.count({ where: { estado: 'NUEVO' } }),
    prisma.equipo.count({
      where: {
        estado: { notIn: ESTADOS_ESPECIALES },
        oficina: { tipo: 'DEPOSITO' },
      },
    }),
    prisma.equipo.count({
      where: {
        estado: { notIn: ESTADOS_ESPECIALES },
        oficina: { tipo: 'SOPORTE' },
      },
    }),
    prisma.equipo.count({ where: { estado: 'EN_SERVICIO_EXTERNO' } }),
    prisma.prestamo.count({ where: { fechaDevolucion: null } }),
    prisma.oficina.count(),
  ]);

  const activos = totalEquipos - equiposNuevos - enDeposito - enReparacion - enServicioExterno - prestamosActivos;

  return {
    totalEquipos,
    equiposNuevos,
    activos: Math.max(0, activos),
    enReparacion,
    enDeposito,
    enServicioExterno,
    prestamosActivos,
    totalUbicaciones: totalOficinas,
  };
}

export async function getRecentActivity(limit = 20, accion?: string) {
  return prisma.historial.findMany({
    where: accion ? { accion: accion as any } : undefined,
    include: {
      equipo: { select: { id: true, serie: true, modelo: true, tipoEquipo: { select: { nombre: true } } } },
      usuario: { select: { nombre: true, ficha: true } },
      oficinaOrigen: { select: { nombre: true } },
      oficinaDestino: { select: { nombre: true } },
    },
    orderBy: { fecha: 'desc' },
    take: limit,
  });
}

export async function getLoansAlerts(limit = 5) {
  const loans = await prisma.prestamo.findMany({
    where: { fechaDevolucion: null },
    orderBy: { fechaPrestamo: 'asc' },
    take: limit,
    include: {
      equipo: {
        select: {
          serie: true,
          modelo: true,
          tipoEquipo: { select: { nombre: true } },
        },
      },
      solicitante: { select: { nombre: true } },
    },
  });

  const now = new Date();
  return loans.map((loan) => ({
    id: loan.id,
    fechaPrestamo: loan.fechaPrestamo.toISOString(),
    diasTranscurridos: Math.floor((now.getTime() - loan.fechaPrestamo.getTime()) / 86400000),
    equipo: loan.equipo,
    funcionario: loan.solicitante,
  }));
}

export async function getRepairAlerts(limit = 5) {
  // Equipos cuya oficina contiene "soporte" (estado EN_REPARACION derivado)
  const equipos = await prisma.equipo.findMany({
    where: {
      estado: { notIn: ESTADOS_ESPECIALES },
      oficina: { nombre: { contains: 'soporte', mode: 'insensitive' } },
    },
    select: {
      id: true,
      serie: true,
      modelo: true,
      tipoEquipo: { select: { nombre: true } },
      historial: {
        where: { accion: 'ENVIO_SOPORTE' },
        orderBy: { fecha: 'desc' },
        take: 1,
        select: { fecha: true },
      },
    },
  });

  const now = new Date();
  const result = equipos.map((eq) => {
    const fechaIngreso = eq.historial[0]?.fecha ?? new Date(0);
    return {
      id: eq.id,
      serie: eq.serie,
      modelo: eq.modelo,
      tipoEquipo: eq.tipoEquipo,
      diasEnReparacion: Math.floor((now.getTime() - fechaIngreso.getTime()) / 86400000),
      fechaIngreso: fechaIngreso.toISOString(),
    };
  });

  // Ordenar por días en reparación descendente (más tiempo primero)
  result.sort((a, b) => b.diasEnReparacion - a.diasEnReparacion);
  return result.slice(0, limit);
}

export async function getEquipmentByType() {
  const grouped = await prisma.equipo.groupBy({
    by: ['tipoEquipoId'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 8,
  });

  // Obtener nombres de los tipos
  const ids = grouped.map((g) => g.tipoEquipoId);
  const tipos = await prisma.tipoEquipo.findMany({
    where: { id: { in: ids } },
    select: { id: true, nombre: true },
  });

  const tipoMap = new Map(tipos.map((t) => [t.id, t.nombre]));

  return grouped.map((g) => ({
    tipoNombre: tipoMap.get(g.tipoEquipoId) ?? 'Desconocido',
    count: g._count.id,
  }));
}
