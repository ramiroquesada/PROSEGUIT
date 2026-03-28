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

export async function moveOffice(id: number, seccionId: number) {
  const seccion = await prisma.seccion.findUnique({ where: { id: seccionId } });
  if (!seccion) throw new AppError(404, 'Sección destino no encontrada');

  try {
    return await prisma.oficina.update({ where: { id }, data: { seccionId } });
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
