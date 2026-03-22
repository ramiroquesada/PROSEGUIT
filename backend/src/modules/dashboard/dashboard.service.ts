import { prisma } from '../../utils/prisma.js';

export async function getStats() {
  const [
    totalEquipos,
    activos,
    enReparacion,
    dadosDeBaja,
    enDeposito,
    prestamosActivos,
    totalOficinas,
  ] = await Promise.all([
    prisma.equipo.count(),
    prisma.equipo.count({ where: { estado: 'ACTIVO' } }),
    prisma.equipo.count({ where: { estado: 'EN_REPARACION' } }),
    prisma.equipo.count({ where: { estado: 'DADO_DE_BAJA' } }),
    prisma.equipo.count({ where: { estado: 'EN_DEPOSITO' } }),
    prisma.prestamo.count({ where: { fechaDevolucion: null } }),
    prisma.oficina.count(),
  ]);

  return {
    totalEquipos,
    activos,
    enReparacion,
    dadosDeBaja,
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
