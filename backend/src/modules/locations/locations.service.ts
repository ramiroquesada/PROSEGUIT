import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../middleware/error-handler.js';

export async function getLocationTree() {
  return prisma.ciudad.findMany({
    include: {
      secciones: {
        include: { oficinas: { orderBy: { nombre: 'asc' } } },
        orderBy: { nombre: 'asc' },
      },
    },
    orderBy: { nombre: 'asc' },
  });
}

export async function createCity(nombre: string) {
  return prisma.ciudad.create({ data: { nombre } });
}

export async function createSection(nombre: string, ciudadId: number) {
  const ciudad = await prisma.ciudad.findUnique({ where: { id: ciudadId } });
  if (!ciudad) throw new AppError(404, 'Ciudad no encontrada');
  return prisma.seccion.create({ data: { nombre, ciudadId } });
}

export async function createOffice(nombre: string, seccionId: number) {
  const seccion = await prisma.seccion.findUnique({ where: { id: seccionId } });
  if (!seccion) throw new AppError(404, 'Sección no encontrada');
  return prisma.oficina.create({ data: { nombre, seccionId } });
}

export async function updateCity(id: number, nombre: string) {
  return prisma.ciudad.update({ where: { id }, data: { nombre } });
}

export async function updateSection(id: number, nombre: string) {
  return prisma.seccion.update({ where: { id }, data: { nombre } });
}

export async function updateOffice(id: number, nombre: string) {
  return prisma.oficina.update({ where: { id }, data: { nombre } });
}

export async function deleteCity(id: number) {
  const ciudad = await prisma.ciudad.findUnique({
    where: { id },
    include: { secciones: { include: { _count: { select: { oficinas: true } } } } },
  });
  if (!ciudad) throw new AppError(404, 'Ciudad no encontrada');

  const hasOficinas = ciudad.secciones.some((s) => s._count.oficinas > 0);
  if (hasOficinas) throw new AppError(409, 'La ciudad tiene secciones con oficinas — eliminá las oficinas primero');

  await prisma.seccion.deleteMany({ where: { ciudadId: id } });
  return prisma.ciudad.delete({ where: { id } });
}

export async function deleteSection(id: number) {
  const seccion = await prisma.seccion.findUnique({
    where: { id },
    include: { _count: { select: { oficinas: true } } },
  });
  if (!seccion) throw new AppError(404, 'Sección no encontrada');
  if (seccion._count.oficinas > 0) throw new AppError(409, 'La sección tiene oficinas — eliminalas primero');

  return prisma.seccion.delete({ where: { id } });
}

export async function deleteOffice(id: number) {
  const oficina = await prisma.oficina.findUnique({
    where: { id },
    include: { _count: { select: { equipos: true } } },
  });
  if (!oficina) throw new AppError(404, 'Oficina no encontrada');

  if (oficina._count.equipos > 0) {
    throw new AppError(409, `No se puede eliminar: la oficina tiene ${oficina._count.equipos} equipo${oficina._count.equipos > 1 ? 's' : ''} asignado${oficina._count.equipos > 1 ? 's' : ''}`);
  }

  return prisma.oficina.delete({ where: { id } });
}

export async function getOfficeMovePreview(id: number) {
  const oficina = await prisma.oficina.findUnique({
    where: { id },
    include: {
      seccion: { include: { ciudad: true } },
      _count: { select: { equipos: true } },
    },
  });
  if (!oficina) throw new AppError(404, 'Oficina no encontrada');

  return {
    id: oficina.id,
    nombre: oficina.nombre,
    cantidadEquipos: oficina._count.equipos,
    ubicacionActual: {
      ciudadId: oficina.seccion.ciudad.id,
      ciudadNombre: oficina.seccion.ciudad.nombre,
      seccionId: oficina.seccion.id,
      seccionNombre: oficina.seccion.nombre,
    },
  };
}

export async function moveOffice(id: number, seccionId: number, usuarioId: number, motivo?: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(3, ${id})::text`;

      const oficina = await tx.oficina.findUnique({
        where: { id },
        include: {
          seccion: { include: { ciudad: true } },
          _count: { select: { equipos: true } },
        },
      });
      if (!oficina) throw new AppError(404, 'Oficina no encontrada');
      if (oficina.seccionId === seccionId) {
        throw new AppError(400, 'La oficina ya pertenece a la sección seleccionada');
      }

      const destino = await tx.seccion.findUnique({
        where: { id: seccionId },
        include: { ciudad: true },
      });
      if (!destino) throw new AppError(404, 'Sección destino no encontrada');

      const actualizada = await tx.oficina.update({
        where: { id },
        data: { seccionId },
        include: { seccion: { include: { ciudad: true } } },
      });

      const movimiento = await tx.movimientoUbicacion.create({
        data: {
          entidad: 'OFICINA',
          entidadId: oficina.id,
          entidadNombre: oficina.nombre,
          origenCiudadId: oficina.seccion.ciudad.id,
          origenCiudadNombre: oficina.seccion.ciudad.nombre,
          origenSeccionId: oficina.seccion.id,
          origenSeccionNombre: oficina.seccion.nombre,
          destinoCiudadId: destino.ciudad.id,
          destinoCiudadNombre: destino.ciudad.nombre,
          destinoSeccionId: destino.id,
          destinoSeccionNombre: destino.nombre,
          cantidadEquipos: oficina._count.equipos,
          motivo: motivo?.trim() || null,
          usuarioId,
        },
      });

      return { oficina: actualizada, movimiento };
    });
  } catch (e: any) {
    if (e?.code === 'P2002') throw new AppError(409, 'Ya existe una oficina con ese nombre en la sección destino');
    throw e;
  }
}

export async function moveSection(id: number, ciudadId: number) {
  const ciudad = await prisma.ciudad.findUnique({ where: { id: ciudadId } });
  if (!ciudad) throw new AppError(404, 'Ciudad destino no encontrada');

  try {
    return await prisma.seccion.update({ where: { id }, data: { ciudadId } });
  } catch (e: any) {
    if (e?.code === 'P2002') throw new AppError(409, 'Ya existe una sección con ese nombre en la ciudad destino');
    throw e;
  }
}
