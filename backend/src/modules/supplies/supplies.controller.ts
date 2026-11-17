import type { Request, Response } from 'express';
import type { TipoMovimientoInsumo } from '@prisma/client';
import * as service from './supplies.service.js';
import { parsePagination } from '../../utils/pagination.js';

const TIPOS: TipoMovimientoInsumo[] = ['INGRESO', 'ENTREGA', 'AJUSTE'];

function positiveInt(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

/** Acepta fechas `YYYY-MM-DD`; `hasta` incluye el día completo. */
function parseDay(value: unknown, endOfDay: boolean): Date | undefined {
  if (typeof value !== 'string' || !value) return undefined;
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T${endOfDay ? '23:59:59.999' : '00:00:00'}` : value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export async function listCategoriesHandler(_req: Request, res: Response) {
  res.json(await service.listCategories());
}

export async function createCategoryHandler(req: Request, res: Response) {
  res.status(201).json(await service.createCategory(req.body));
}

export async function updateCategoryHandler(req: Request, res: Response) {
  res.json(await service.updateCategory(Number(req.params.id), req.body));
}

export async function listHandler(req: Request, res: Response) {
  res.json(await service.listSupplies({
    search: typeof req.query.search === 'string' && req.query.search.trim() ? req.query.search.trim() : undefined,
    categoriaId: positiveInt(req.query.categoriaId),
    incluirInactivos: req.query.incluirInactivos === 'true',
  }));
}

export async function getHandler(req: Request, res: Response) {
  res.json(await service.getSupply(Number(req.params.id)));
}

export async function createHandler(req: Request, res: Response) {
  res.status(201).json(await service.createSupply(req.body, req.user!.userId));
}

export async function updateHandler(req: Request, res: Response) {
  res.json(await service.updateSupply(Number(req.params.id), req.body));
}

export async function movementHandler(req: Request, res: Response) {
  res.status(201).json(await service.registerMovement(Number(req.params.id), req.body, req.user!.userId));
}

export async function listMovementsHandler(req: Request, res: Response) {
  const tipo = req.query.tipo as TipoMovimientoInsumo | undefined;
  res.json(await service.listMovements(parsePagination(req.query), {
    insumoId: positiveInt(req.query.insumoId),
    categoriaId: positiveInt(req.query.categoriaId),
    oficinaId: positiveInt(req.query.oficinaId),
    tipo: tipo && TIPOS.includes(tipo) ? tipo : undefined,
    desde: parseDay(req.query.desde, false),
    hasta: parseDay(req.query.hasta, true),
  }));
}
