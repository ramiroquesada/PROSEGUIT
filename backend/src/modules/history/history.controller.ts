import type { Request, Response } from 'express';
import * as historyService from './history.service.js';
import { parsePagination } from '../../utils/pagination.js';

export async function listHandler(req: Request, res: Response) {
  const pagination = parsePagination(req.query);
  const filters = {
    equipoId: req.query.equipoId ? Number(req.query.equipoId) : undefined,
    accion: req.query.accion as string | undefined,
    usuarioId: req.query.usuarioId ? Number(req.query.usuarioId) : undefined,
    desde: req.query.desde ? new Date(req.query.desde as string) : undefined,
    hasta: req.query.hasta ? new Date(req.query.hasta as string) : undefined,
    search: req.query.search as string | undefined,
  };

  const result = await historyService.listHistory(pagination, filters);
  res.json(result);
}

export async function equipmentHistoryHandler(req: Request, res: Response) {
  const data = await historyService.getEquipmentHistory(Number(req.params.equipoId));
  res.json(data);
}
