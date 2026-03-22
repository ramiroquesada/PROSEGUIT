import type { Request, Response } from 'express';
import * as loansService from './loans.service.js';
import { parsePagination } from '../../utils/pagination.js';

export async function listHandler(req: Request, res: Response) {
  const pagination = parsePagination(req.query);
  const filters = {
    activo: req.query.activo !== undefined ? req.query.activo === 'true' : undefined,
    equipoId: req.query.equipoId ? Number(req.query.equipoId) : undefined,
    search: req.query.search as string | undefined,
  };

  const result = await loansService.listLoans(pagination, filters);
  res.json(result);
}

export async function createHandler(req: Request, res: Response) {
  const prestamo = await loansService.createLoan(req.body, req.user!.userId);
  res.status(201).json(prestamo);
}

export async function returnHandler(req: Request, res: Response) {
  const prestamo = await loansService.returnLoan(
    Number(req.params.id),
    req.body,
    req.user!.userId,
  );
  res.json(prestamo);
}
