import type { Request, Response } from 'express';
import * as service from './service-providers.service.js';

export async function listHandler(_req: Request, res: Response) {
  const data = await service.listProviders();
  res.json(data);
}

export async function getByIdHandler(req: Request, res: Response) {
  const data = await service.getProviderById(Number(req.params.id));
  res.json(data);
}

export async function createHandler(req: Request, res: Response) {
  const data = await service.createProvider(req.body);
  res.status(201).json(data);
}

export async function updateHandler(req: Request, res: Response) {
  const data = await service.updateProvider(Number(req.params.id), req.body);
  res.json(data);
}
