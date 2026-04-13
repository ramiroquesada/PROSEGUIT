import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../middleware/error-handler.js';
import type { PaginationParams } from '../../utils/pagination.js';

type LicenseStatus = 'VIGENTE' | 'POR_VENCER' | 'VENCIDA';

function resolveLicenseStatus(fechaExpiracion: Date | null | undefined): LicenseStatus {
  if (!fechaExpiracion) return 'VIGENTE';
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  if (fechaExpiracion < now) return 'VENCIDA';
  if (fechaExpiracion <= in30) return 'POR_VENCER';
  return 'VIGENTE';
}

interface LicenseFilters {
  software?: string;
  estado?: LicenseStatus;
  equipoId?: number;
  search?: string;
}

export async function listLicenses(pagination: PaginationParams, filters: LicenseFilters) {
  const where: any = {};

  if (filters.equipoId) where.equipoId = filters.equipoId;

  if (filters.software) {
    where.software = { contains: filters.software, mode: 'insensitive' };
  }

  if (filters.search) {
    const searchNum = Number(filters.search);
    where.OR = [
      { software: { contains: filters.search, mode: 'insensitive' } },
      { equipo: { modelo: { contains: filters.search, mode: 'insensitive' } } },
      ...(Number.isInteger(searchNum) ? [{ equipo: { serie: searchNum } }] : []),
    ];
  }

  const [data, total] = await Promise.all([
    prisma.licencia.findMany({
      where,
      include: {
        equipo: {
          select: {
            id: true,
            serie: true,
            modelo: true,
            tipoEquipo: { select: { nombre: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    }),
    prisma.licencia.count({ where }),
  ]);

  // Agregar estado derivado
  const dataWithStatus = data.map((lic) => ({
    ...lic,
    estado: resolveLicenseStatus(lic.fechaExpiracion),
  }));

  // Filtrar por estado si se especifica
  let filteredData = dataWithStatus;
  if (filters.estado) {
    filteredData = dataWithStatus.filter((lic) => lic.estado === filters.estado);
  }

  return {
    data: filteredData,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    },
  };
}

export async function getLicensesSummary() {
  const licencias = await prisma.licencia.findMany({
    include: {
      equipo: true,
    },
  });

  const summary: Record<
    string,
    { software: string; total: number; vigentes: number; porVencer: number; vencidas: number }
  > = {};

  for (const lic of licencias) {
    if (!summary[lic.software]) {
      summary[lic.software] = {
        software: lic.software,
        total: 0,
        vigentes: 0,
        porVencer: 0,
        vencidas: 0,
      };
    }

    summary[lic.software].total += 1;

    const status = resolveLicenseStatus(lic.fechaExpiracion);
    if (status === 'VIGENTE') summary[lic.software].vigentes += 1;
    if (status === 'POR_VENCER') summary[lic.software].porVencer += 1;
    if (status === 'VENCIDA') summary[lic.software].vencidas += 1;
  }

  return Object.values(summary);
}

export async function getLicenseById(id: number) {
  const licencia = await prisma.licencia.findUnique({
    where: { id },
    include: {
      equipo: {
        select: {
          id: true,
          serie: true,
          modelo: true,
          tipoEquipo: { select: { nombre: true } },
        },
      },
    },
  });

  if (!licencia) throw new AppError(404, 'Licencia no encontrada');

  return {
    ...licencia,
    estado: resolveLicenseStatus(licencia.fechaExpiracion),
  };
}

export async function createLicense(data: {
  software: string;
  version?: string;
  fechaExpiracion?: string;
  equipoId: number;
}) {
  const equipo = await prisma.equipo.findUnique({ where: { id: data.equipoId } });
  if (!equipo) throw new AppError(404, 'Equipo no encontrado');

  const licencia = await prisma.licencia.create({
    data: {
      software: data.software,
      version: data.version || null,
      fechaExpiracion: data.fechaExpiracion ? new Date(data.fechaExpiracion) : null,
      equipoId: data.equipoId,
    },
    include: {
      equipo: {
        select: {
          id: true,
          serie: true,
          modelo: true,
          tipoEquipo: { select: { nombre: true } },
        },
      },
    },
  });

  return {
    ...licencia,
    estado: resolveLicenseStatus(licencia.fechaExpiracion),
  };
}

export async function updateLicense(
  id: number,
  data: {
    software?: string;
    version?: string;
    fechaExpiracion?: string;
  },
) {
  const existing = await prisma.licencia.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'Licencia no encontrada');

  const licencia = await prisma.licencia.update({
    where: { id },
    data: {
      software: data.software !== undefined ? data.software : existing.software,
      version: data.version !== undefined ? (data.version || null) : existing.version,
      fechaExpiracion:
        data.fechaExpiracion !== undefined
          ? data.fechaExpiracion
            ? new Date(data.fechaExpiracion)
            : null
          : existing.fechaExpiracion,
    },
    include: {
      equipo: {
        select: {
          id: true,
          serie: true,
          modelo: true,
          tipoEquipo: { select: { nombre: true } },
        },
      },
    },
  });

  return {
    ...licencia,
    estado: resolveLicenseStatus(licencia.fechaExpiracion),
  };
}

export async function deleteLicense(id: number) {
  const existing = await prisma.licencia.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'Licencia no encontrada');

  await prisma.licencia.delete({ where: { id } });
  return { success: true };
}
