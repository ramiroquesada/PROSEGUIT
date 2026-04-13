import type { Request, Response } from 'express';
import * as licensesService from './licenses.service.js';
import { parsePagination } from '../../utils/pagination.js';

export async function listHandler(req: Request, res: Response) {
  const pagination = parsePagination(req.query);
  const filters = {
    software: req.query.software as string | undefined,
    estado: (req.query.estado as 'VIGENTE' | 'POR_VENCER' | 'VENCIDA' | undefined) || undefined,
    equipoId: req.query.equipoId ? Number(req.query.equipoId) : undefined,
    search: req.query.search as string | undefined,
  };

  const result = await licensesService.listLicenses(pagination, filters);
  res.json(result);
}

export async function summaryHandler(req: Request, res: Response) {
  const summary = await licensesService.getLicensesSummary();
  res.json(summary);
}

export async function getOneHandler(req: Request, res: Response) {
  const licencia = await licensesService.getLicenseById(Number(req.params.id));
  res.json(licencia);
}

export async function createHandler(req: Request, res: Response) {
  const licencia = await licensesService.createLicense(req.body);
  res.status(201).json(licencia);
}

export async function updateHandler(req: Request, res: Response) {
  const licencia = await licensesService.updateLicense(Number(req.params.id), req.body);
  res.json(licencia);
}

export async function deleteHandler(req: Request, res: Response) {
  await licensesService.deleteLicense(Number(req.params.id));
  res.json({ success: true });
}
