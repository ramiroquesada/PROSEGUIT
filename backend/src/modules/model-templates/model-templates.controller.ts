import type { Request, Response } from 'express';
import * as service from './model-templates.service.js';

export async function listHandler(req: Request, res: Response) {
  const tipoEquipoId = req.query.tipoEquipoId ? Number(req.query.tipoEquipoId) : undefined;
  const data = await service.listTemplates(tipoEquipoId);
  res.json(data);
}

export async function getByIdHandler(req: Request, res: Response) {
  const data = await service.getTemplateById(Number(req.params.id));
  res.json(data);
}

export async function createHandler(req: Request, res: Response) {
  const data = await service.createTemplate(req.body);
  res.status(201).json(data);
}

export async function updateHandler(req: Request, res: Response) {
  const data = await service.updateTemplate(Number(req.params.id), req.body);
  res.json(data);
}

export async function deleteHandler(req: Request, res: Response) {
  await service.deleteTemplate(Number(req.params.id));
  res.status(204).send();
}
