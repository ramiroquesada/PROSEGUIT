import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../middleware/error-handler.js';

export async function getLocationTree() {
  const ciudades = await prisma.ciudad.findMany({
    include: {
      secciones: {
        include: {
          oficinas: {
            orderBy: { nombre: 'asc' },
          },
        },
        orderBy: { nombre: 'asc' },
      },
    },
    orderBy: { nombre: 'asc' },
  });

  return ciudades;
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
