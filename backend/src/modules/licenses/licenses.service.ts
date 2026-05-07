import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../middleware/error-handler.js';
import { paginatedResult, type PaginationParams } from '../../utils/pagination.js';

type LicenseStatus = 'VIGENTE' | 'POR_VENCER' | 'VENCIDA' | 'PERPETUA' | 'SIN_FECHA';

function resolveLicenseStatus(
  fechaExpiracion: Date | null | undefined,
  sinExpiracion: boolean,
): LicenseStatus {
  if (sinExpiracion) return 'PERPETUA';
  if (!fechaExpiracion) return 'SIN_FECHA';

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
    estado: resolveLicenseStatus(lic.fechaExpiracion, lic.sinExpiracion),
  }));

  // Filtrar por estado si se especifica
  let filteredData = dataWithStatus;
  if (filters.estado) {
    filteredData = dataWithStatus.filter((lic) => lic.estado === filters.estado);
  }

  return paginatedResult(filteredData, total, pagination);
}

export async function getLicensesSummary() {
  const licencias = await prisma.licencia.findMany();

  const summary: Record<
    string,
    {
      software: string;
      total: number;
      vigentes: number;
      porVencer: number;
      vencidas: number;
      perpetuas: number;
      sinFecha: number;
    }
  > = {};

  for (const lic of licencias) {
    if (!summary[lic.software]) {
      summary[lic.software] = {
        software: lic.software,
        total: 0,
        vigentes: 0,
        porVencer: 0,
        vencidas: 0,
        perpetuas: 0,
        sinFecha: 0,
      };
    }

    summary[lic.software].total += 1;

    const status = resolveLicenseStatus(lic.fechaExpiracion, lic.sinExpiracion);
    if (status === 'VIGENTE') summary[lic.software].vigentes += 1;
    if (status === 'POR_VENCER') summary[lic.software].porVencer += 1;
    if (status === 'VENCIDA') summary[lic.software].vencidas += 1;
    if (status === 'PERPETUA') summary[lic.software].perpetuas += 1;
    if (status === 'SIN_FECHA') summary[lic.software].sinFecha += 1;
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
    estado: resolveLicenseStatus(licencia.fechaExpiracion, licencia.sinExpiracion),
  };
}

export async function createLicense(data: {
  software: string;
  version?: string;
  clave?: string;
  tipo?: string;
  proveedor?: string;
  precioCompra?: string;
  fechaCompra?: string;
  fechaExpiracion?: string;
  sinExpiracion?: boolean;
  observacion?: string;
  equipoId?: number;
}) {
  if (data.equipoId) {
    const equipo = await prisma.equipo.findUnique({ where: { id: data.equipoId } });
    if (!equipo) throw new AppError(404, 'Equipo no encontrado');
  }

  const licencia = await prisma.licencia.create({
    data: {
      software: data.software,
      version: data.version || null,
      clave: data.clave || null,
      tipo: data.tipo || null,
      proveedor: data.proveedor || null,
      precioCompra: data.precioCompra ? parseFloat(data.precioCompra) : null,
      fechaCompra: data.fechaCompra ? new Date(data.fechaCompra) : null,
      fechaExpiracion: data.fechaExpiracion ? new Date(data.fechaExpiracion) : null,
      sinExpiracion: data.sinExpiracion ?? false,
      observacion: data.observacion || null,
      equipoId: data.equipoId || null,
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
    estado: resolveLicenseStatus(licencia.fechaExpiracion, licencia.sinExpiracion),
  };
}

export async function updateLicense(
  id: number,
  data: {
    software?: string;
    version?: string | null;
    clave?: string | null;
    tipo?: string | null;
    proveedor?: string | null;
    precioCompra?: string | null;
    fechaCompra?: string | null;
    fechaExpiracion?: string | null;
    sinExpiracion?: boolean;
    observacion?: string | null;
    equipoId?: number | null;
  },
) {
  const existing = await prisma.licencia.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'Licencia no encontrada');

  if (data.equipoId !== undefined && data.equipoId !== null) {
    const equipo = await prisma.equipo.findUnique({ where: { id: data.equipoId } });
    if (!equipo) throw new AppError(404, 'Equipo no encontrado');
  }

  const updateData: any = {};

  if (data.software !== undefined) updateData.software = data.software;
  if (data.version !== undefined) updateData.version = data.version;
  if (data.clave !== undefined) updateData.clave = data.clave;
  if (data.tipo !== undefined) updateData.tipo = data.tipo;
  if (data.proveedor !== undefined) updateData.proveedor = data.proveedor;
  if (data.precioCompra !== undefined) updateData.precioCompra = data.precioCompra ? parseFloat(data.precioCompra) : null;
  if (data.fechaCompra !== undefined) updateData.fechaCompra = data.fechaCompra ? new Date(data.fechaCompra) : null;
  if (data.fechaExpiracion !== undefined) updateData.fechaExpiracion = data.fechaExpiracion ? new Date(data.fechaExpiracion) : null;
  if (data.sinExpiracion !== undefined) updateData.sinExpiracion = data.sinExpiracion;
  if (data.observacion !== undefined) updateData.observacion = data.observacion;
  if (data.equipoId !== undefined) updateData.equipoId = data.equipoId;

  const licencia = await prisma.licencia.update({
    where: { id },
    data: updateData,
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
    estado: resolveLicenseStatus(licencia.fechaExpiracion, licencia.sinExpiracion),
  };
}

export async function deleteLicense(id: number) {
  const existing = await prisma.licencia.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'Licencia no encontrada');

  await prisma.licencia.delete({ where: { id } });
  return { success: true };
}
