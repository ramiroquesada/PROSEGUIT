import { prisma } from '../utils/prisma.js';
import type { PrismaClient } from '@prisma/client';
import { pathToFileURL } from 'node:url';

type Severity = 'error' | 'warning' | 'info';

interface Finding {
  code: string;
  severity: Severity;
  description: string;
  count: number;
  sample: unknown[];
}

const SAMPLE_LIMIT = 25;

function finding(
  code: string,
  severity: Severity,
  description: string,
  records: unknown[]
): Finding {
  return {
    code,
    severity,
    description,
    count: records.length,
    sample: records.slice(0, SAMPLE_LIMIT),
  };
}

function findingCount(
  code: string,
  severity: Severity,
  description: string,
  count: number
): Finding {
  return { code, severity, description, count, sample: [] };
}

function expectedOfficeState(tipo: 'OFICINA' | 'SOPORTE' | 'DEPOSITO') {
  if (tipo === 'SOPORTE') return 'EN_REPARACION';
  if (tipo === 'DEPOSITO') return 'EN_DEPOSITO';
  return 'ACTIVO';
}

export async function auditData(db: PrismaClient = prisma) {
  const [loans, equipment, cities, activeUsers, expiredRefreshTokens] = await Promise.all([
    db.prestamo.findMany({
      select: {
        id: true,
        activo: true,
        fechaPrestamo: true,
        fechaDevolucion: true,
        equipo: { select: { id: true, serie: true, estado: true } },
      },
      orderBy: [{ equipoId: 'asc' }, { fechaPrestamo: 'asc' }],
    }),
    db.equipo.findMany({
      select: {
        id: true,
        serie: true,
        estado: true,
        oficina: {
          select: {
            id: true,
            nombre: true,
            tipo: true,
            seccion: {
              select: {
                nombre: true,
                ciudad: { select: { nombre: true } },
              },
            },
          },
        },
        prestamos: {
          where: { activo: true },
          select: { id: true, fechaPrestamo: true },
          orderBy: { fechaPrestamo: 'asc' },
        },
        enviosServicio: {
          where: { fechaRetorno: null },
          select: { id: true, fechaEnvio: true },
          orderBy: { fechaEnvio: 'asc' },
        },
        _count: { select: { historial: true } },
      },
      orderBy: { serie: 'asc' },
    }),
    db.ciudad.findMany({
      select: {
        id: true,
        nombre: true,
        secciones: {
          select: {
            id: true,
            nombre: true,
            oficinas: {
              select: {
                id: true,
                nombre: true,
                tipo: true,
                _count: { select: { equipos: true } },
              },
            },
          },
        },
      },
      orderBy: { nombre: 'asc' },
    }),
    db.usuario.findMany({
      where: { activo: true },
      select: { id: true, rol: true, forcePasswordChange: true },
      orderBy: { ficha: 'asc' },
    }),
    db.refreshToken.count({ where: { expiresAt: { lt: new Date() } } }),
  ]);

  const activeLoansByEquipment = new Map<number, typeof loans>();
  const openLoansByEquipment = new Map<number, typeof loans>();

  for (const loan of loans) {
    if (loan.activo) {
      const current = activeLoansByEquipment.get(loan.equipo.id) ?? [];
      current.push(loan);
      activeLoansByEquipment.set(loan.equipo.id, current);
    }
    if (loan.fechaDevolucion === null) {
      const current = openLoansByEquipment.get(loan.equipo.id) ?? [];
      current.push(loan);
      openLoansByEquipment.set(loan.equipo.id, current);
    }
  }

  const duplicateActiveLoans = [...activeLoansByEquipment.values()]
    .filter((group) => group.length > 1)
    .map((group) => ({
      equipoId: group[0].equipo.id,
      serie: group[0].equipo.serie,
      estado: group[0].equipo.estado,
      prestamosActivos: group.map((loan) => loan.id),
      fechas: group.map((loan) => loan.fechaPrestamo),
    }));

  const duplicateOpenLoans = [...openLoansByEquipment.values()]
    .filter((group) => group.length > 1)
    .map((group) => ({
      equipoId: group[0].equipo.id,
      serie: group[0].equipo.serie,
      prestamosSinDevolucion: group.map((loan) => loan.id),
    }));

  const inconsistentLoanFlags = loans
    .filter((loan) => loan.activo !== (loan.fechaDevolucion === null))
    .map((loan) => ({
      prestamoId: loan.id,
      equipoId: loan.equipo.id,
      serie: loan.equipo.serie,
      activo: loan.activo,
      fechaDevolucion: loan.fechaDevolucion,
    }));

  const activeLoanWrongState = equipment
    .filter((item) => item.prestamos.length > 0 && item.estado !== 'PRESTADO')
    .map((item) => ({
      equipoId: item.id,
      serie: item.serie,
      estado: item.estado,
      prestamosActivos: item.prestamos.map((loan) => loan.id),
    }));

  const borrowedWithoutActiveLoan = equipment
    .filter((item) => item.estado === 'PRESTADO' && item.prestamos.length === 0)
    .map((item) => ({ equipoId: item.id, serie: item.serie }));

  const activeServiceWrongState = equipment
    .filter((item) => item.enviosServicio.length > 0 && item.estado !== 'EN_SERVICIO_EXTERNO')
    .map((item) => ({
      equipoId: item.id,
      serie: item.serie,
      estado: item.estado,
      enviosActivos: item.enviosServicio.map((service) => service.id),
    }));

  const externalStateWithoutService = equipment
    .filter((item) => item.estado === 'EN_SERVICIO_EXTERNO' && item.enviosServicio.length === 0)
    .map((item) => ({ equipoId: item.id, serie: item.serie }));

  const overlappingProcesses = equipment
    .filter((item) => item.prestamos.length > 0 && item.enviosServicio.length > 0)
    .map((item) => ({
      equipoId: item.id,
      serie: item.serie,
      prestamosActivos: item.prestamos.map((loan) => loan.id),
      enviosActivos: item.enviosServicio.map((service) => service.id),
    }));

  const officeStateMismatch = equipment
    .filter((item) => {
      if (item.prestamos.length > 0 || item.enviosServicio.length > 0 || item.estado === 'NUEVO') return false;
      return item.estado !== expectedOfficeState(item.oficina.tipo);
    })
    .map((item) => ({
      equipoId: item.id,
      serie: item.serie,
      estado: item.estado,
      estadoEsperado: expectedOfficeState(item.oficina.tipo),
      oficina: item.oficina.nombre,
      tipoOficina: item.oficina.tipo,
    }));

  const equipmentWithoutHistory = equipment
    .filter((item) => item._count.historial === 0)
    .map((item) => ({ equipoId: item.id, serie: item.serie }));

  const citiesWithoutSections = cities
    .filter((city) => city.secciones.length === 0)
    .map((city) => ({ ciudadId: city.id, ciudad: city.nombre }));

  const sectionsWithoutOffices = cities.flatMap((city) => city.secciones
    .filter((section) => section.oficinas.length === 0)
    .map((section) => ({
      ciudadId: city.id,
      ciudad: city.nombre,
      seccionId: section.id,
      seccion: section.nombre,
    })));

  const officesWithoutEquipment = cities.flatMap((city) => city.secciones.flatMap((section) =>
    section.oficinas
      .filter((office) => office._count.equipos === 0)
      .map((office) => ({
        ciudad: city.nombre,
        seccion: section.nombre,
        oficinaId: office.id,
        oficina: office.nombre,
        tipo: office.tipo,
      }))
  ));

  const usersWithoutForcedChange = activeUsers
    .filter((user) => !user.forcePasswordChange)
    .map((user) => ({ id: user.id, rol: user.rol }));

  const findings = [
    finding('LOAN_MULTIPLE_ACTIVE', 'error', 'Equipos con más de un préstamo marcado como activo.', duplicateActiveLoans),
    finding('LOAN_MULTIPLE_WITHOUT_RETURN', 'error', 'Equipos con más de un préstamo sin fecha de devolución.', duplicateOpenLoans),
    finding('LOAN_FLAG_DATE_MISMATCH', 'error', 'Préstamos cuyo indicador activo contradice la fecha de devolución.', inconsistentLoanFlags),
    finding('LOAN_ACTIVE_WRONG_EQUIPMENT_STATE', 'error', 'Equipos con préstamo activo cuyo estado almacenado no es PRESTADO.', activeLoanWrongState),
    finding('EQUIPMENT_BORROWED_WITHOUT_ACTIVE_LOAN', 'error', 'Equipos en PRESTADO sin un préstamo activo asociado.', borrowedWithoutActiveLoan),
    finding('SERVICE_ACTIVE_WRONG_EQUIPMENT_STATE', 'error', 'Equipos con servicio externo abierto cuyo estado no coincide.', activeServiceWrongState),
    finding('EQUIPMENT_EXTERNAL_WITHOUT_ACTIVE_SERVICE', 'error', 'Equipos en servicio externo sin un envío abierto.', externalStateWithoutService),
    finding('EQUIPMENT_OVERLAPPING_PROCESSES', 'error', 'Equipos con préstamo y servicio externo abiertos simultáneamente.', overlappingProcesses),
    finding('EQUIPMENT_OFFICE_STATE_MISMATCH', 'warning', 'Estados almacenados que no coinciden con el tipo de oficina cuando no hay un proceso especial.', officeStateMismatch),
    finding('EQUIPMENT_WITHOUT_HISTORY', 'warning', 'Equipos sin ningún evento de historial.', equipmentWithoutHistory),
    finding('AUTH_NO_FORCED_PASSWORD_CHANGE', 'warning', 'Usuarios activos que no tienen pendiente un cambio obligatorio; requiere validar credenciales.', usersWithoutForcedChange),
    finding('LOCATION_CITY_WITHOUT_SECTIONS', 'info', 'Ciudades todavía sin secciones.', citiesWithoutSections),
    finding('LOCATION_SECTION_WITHOUT_OFFICES', 'info', 'Secciones todavía sin oficinas.', sectionsWithoutOffices),
    finding('LOCATION_OFFICE_WITHOUT_EQUIPMENT', 'info', 'Oficinas sin equipos asignados.', officesWithoutEquipment),
    findingCount('AUTH_EXPIRED_REFRESH_TOKENS', 'info', 'Refresh tokens vencidos que pueden purgarse.', expiredRefreshTokens),
  ];

  return {
    generatedAt: new Date().toISOString(),
    readOnly: true,
    totals: {
      users: activeUsers.length,
      cities: cities.length,
      sections: cities.reduce((total, city) => total + city.secciones.length, 0),
      offices: cities.reduce(
        (total, city) => total + city.secciones.reduce((subtotal, section) => subtotal + section.oficinas.length, 0),
        0
      ),
      equipment: equipment.length,
      loans: loans.length,
    },
    summary: {
      errorGroups: findings.filter((item) => item.severity === 'error' && item.count > 0).length,
      warningGroups: findings.filter((item) => item.severity === 'warning' && item.count > 0).length,
      infoGroups: findings.filter((item) => item.severity === 'info' && item.count > 0).length,
    },
    findings,
  };
}

function printHumanReport(report: Awaited<ReturnType<typeof auditData>>) {
  console.log('PROSEGUIT — Auditoría de integridad de datos (solo lectura)');
  console.log(`Generada: ${report.generatedAt}`);
  console.log(
    `Totales: ${report.totals.equipment} equipos, ${report.totals.loans} préstamos, `
    + `${report.totals.cities} ciudades, ${report.totals.sections} secciones, ${report.totals.offices} oficinas`
  );
  console.log('');

  for (const item of report.findings) {
    const marker = item.severity === 'error' ? 'ERROR' : item.severity === 'warning' ? 'AVISO' : 'INFO';
    console.log(`[${marker}] ${item.code}: ${item.count}`);
    console.log(`  ${item.description}`);
    if (item.sample.length > 0) console.log(`  Muestra: ${JSON.stringify(item.sample)}`);
  }

  console.log('');
  console.log(
    `Grupos con hallazgos: ${report.summary.errorGroups} errores, `
    + `${report.summary.warningGroups} avisos, ${report.summary.infoGroups} informativos.`
  );
}

async function main() {
  const report = await auditData();
  if (process.argv.includes('--json')) console.log(JSON.stringify(report, null, 2));
  else printHumanReport(report);

  if (process.argv.includes('--fail-on-error') && report.summary.errorGroups > 0) {
    process.exitCode = 2;
  }
}

const isDirectExecution = process.argv[1]
  ? pathToFileURL(process.argv[1]).href === import.meta.url
  : false;

if (isDirectExecution) {
  main()
    .catch((error) => {
      console.error('No se pudo completar la auditoría de datos.');
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
