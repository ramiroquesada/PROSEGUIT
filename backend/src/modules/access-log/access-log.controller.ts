import type { Request, Response } from 'express';
import * as accessLogService from './access-log.service.js';
import { parsePagination } from '../../utils/pagination.js';
import { z } from 'zod';

const dateSchema = z.coerce.date();

function parseDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  const result = dateSchema.safeParse(value);
  return result.success ? result.data : undefined;
}

export async function listHandler(req: Request, res: Response) {
  const pagination = parsePagination(req.query);
  const ficha = Number(req.query.ficha);
  const filters = {
    evento: req.query.evento as string | undefined,
    ficha: Number.isInteger(ficha) && ficha > 0 ? ficha : undefined,
    desde: parseDate(req.query.desde),
    hasta: parseDate(req.query.hasta),
  };
  res.json(await accessLogService.listAccess(pagination, filters));
}

export async function summaryHandler(_req: Request, res: Response) {
  res.json(await accessLogService.getSummary());
}
