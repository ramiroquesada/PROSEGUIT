import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../middleware/error-handler.js';

export async function listProviders() {
  return prisma.servicioExterno.findMany({
    include: { _count: { select: { envios: true } } },
    orderBy: { nombre: 'asc' },
  });
}

export async function getProviderById(id: number) {
  const provider = await prisma.servicioExterno.findUnique({
    where: { id },
    include: {
      envios: {
        include: {
          equipo: { select: { id: true, serie: true, modelo: true } },
          tecnico: { select: { id: true, nombre: true } },
        },
        orderBy: { fechaEnvio: 'desc' },
      },
    },
  });
  if (!provider) throw new AppError(404, 'Servicio externo no encontrado');
  return provider;
}

export async function createProvider(data: {
  nombre: string;
  contacto?: string;
  telefono?: string;
}) {
  return prisma.servicioExterno.create({ data });
}

export async function updateProvider(id: number, data: {
  nombre?: string;
  contacto?: string;
  telefono?: string;
  activo?: boolean;
}) {
  const existing = await prisma.servicioExterno.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'Servicio externo no encontrado');

  return prisma.servicioExterno.update({ where: { id }, data });
}
