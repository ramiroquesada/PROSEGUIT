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
    // NUEVO: recién ingresados, pendientes de asignación
    prisma.equipo.count({ where: { estado: 'NUEVO' } }),
    // EN_DEPOSITO: equipos en oficinas cuyo nombre contiene "deposito"
    prisma.equipo.count({
      where: {
        estado: { notIn: ESTADOS_ESPECIALES },
        oficina: {
          OR: [
            { nombre: { contains: 'deposito', mode: 'insensitive' } },
            { nombre: { contains: 'depósito', mode: 'insensitive' } },
          ],
        },
      },
    }),
    // EN_REPARACION: equipos en oficinas cuyo nombre contiene "soporte"
    prisma.equipo.count({
      where: {
        estado: { notIn: ESTADOS_ESPECIALES },
        oficina: { nombre: { contains: 'soporte', mode: 'insensitive' } },
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
    prestamosActivos,
    totalUbicaciones: totalOficinas,
  };
}

export async function getRecentActivity(limit = 20) {
  return prisma.historial.findMany({
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
