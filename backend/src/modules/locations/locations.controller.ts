import type { Request, Response } from 'express';
import * as locationsService from './locations.service.js';

export async function treeHandler(_req: Request, res: Response) {
  const tree = await locationsService.getLocationTree();
  res.json(tree);
}

export async function createCityHandler(req: Request, res: Response) {
  const city = await locationsService.createCity(req.body.nombre);
  res.status(201).json(city);
}

export async function createSectionHandler(req: Request, res: Response) {
  const section = await locationsService.createSection(req.body.nombre, req.body.ciudadId);
  res.status(201).json(section);
}

export async function createOfficeHandler(req: Request, res: Response) {
  const office = await locationsService.createOffice(req.body.nombre, req.body.seccionId);
  res.status(201).json(office);
}

export async function updateCityHandler(req: Request, res: Response) {
  const city = await locationsService.updateCity(Number(req.params.id), req.body.nombre);
  res.json(city);
}

export async function updateSectionHandler(req: Request, res: Response) {
  const section = await locationsService.updateSection(Number(req.params.id), req.body.nombre);
  res.json(section);
}

export async function updateOfficeHandler(req: Request, res: Response) {
  const office = await locationsService.updateOffice(Number(req.params.id), req.body.nombre);
  res.json(office);
}
