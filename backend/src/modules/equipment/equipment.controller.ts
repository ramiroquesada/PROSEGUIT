import type { Request, Response } from 'express';
import * as equipmentService from './equipment.service.js';
import { parsePagination } from '../../utils/pagination.js';

export async function listHandler(req: Request, res: Response) {
  const pagination = parsePagination(req.query);
  const sortByRaw = req.query.sortBy as string | undefined;
  const sortBy: 'serie' | 'modelo' | 'tipo' | undefined =
    (sortByRaw === 'serie' || sortByRaw === 'modelo' || sortByRaw === 'tipo') ? sortByRaw : undefined;
  const sortDirRaw = req.query.sortDir as string | undefined;
  const sortDir: 'asc' | 'desc' | undefined =
    (sortDirRaw === 'asc' || sortDirRaw === 'desc') ? sortDirRaw : undefined;

  const filters = {
    tipoEquipoId: req.query.tipoEquipoId ? Number(req.query.tipoEquipoId) : undefined,
    estado: req.query.estado as string | undefined,
    oficinaId: req.query.oficinaId ? Number(req.query.oficinaId) : undefined,
    ciudadId: req.query.ciudadId ? Number(req.query.ciudadId) : undefined,
    seccionId: req.query.seccionId ? Number(req.query.seccionId) : undefined,
    search: req.query.search as string | undefined,
    sortBy,
    sortDir,
  };

  const result = await equipmentService.listEquipment(pagination, filters);
  res.json(result);
}

export async function getByIdHandler(req: Request, res: Response) {
  const equipo = await equipmentService.getEquipmentById(Number(req.params.id));
  res.json(equipo);
}

export async function createHandler(req: Request, res: Response) {
  const equipo = await equipmentService.createEquipment(req.body, req.user!.userId);
  res.status(201).json(equipo);
}

export async function updateHandler(req: Request, res: Response) {
  const equipo = await equipmentService.updateEquipment(
    Number(req.params.id),
    req.body,
    req.user!.userId,
  );
  res.json(equipo);
}

export async function transferHandler(req: Request, res: Response) {
  const equipo = await equipmentService.transferEquipment(
    Number(req.params.id),
    req.body,
    req.user!.userId,
  );
  res.json(equipo);
}

export async function sendToSupportHandler(req: Request, res: Response) {
  const equipo = await equipmentService.sendToSupport(
    Number(req.params.id),
    req.body,
    req.user!.userId,
  );
  res.json(equipo);
}

export async function sendToServiceHandler(req: Request, res: Response) {
  const equipo = await equipmentService.sendToService(
    Number(req.params.id),
    req.body,
    req.user!.userId,
  );
  res.json(equipo);
}

export async function returnFromServiceHandler(req: Request, res: Response) {
  const equipo = await equipmentService.returnFromService(
    Number(req.params.id),
    req.body,
    req.user!.userId,
  );
  res.json(equipo);
}

export async function typesHandler(_req: Request, res: Response) {
  const tipos = await equipmentService.getEquipmentTypes();
  res.json(tipos);
}

export async function nextSerieHandler(_req: Request, res: Response) {
  const nextSerie = await equipmentService.getNextSerie();
  res.json({ nextSerie });
}

export async function uploadImageHandler(req: Request, res: Response) {
  if (!req.file) {
    res.status(400).json({ error: 'No se recibió ningún archivo' });
    return;
  }
  const descripcion = typeof req.body.descripcion === 'string' && req.body.descripcion.trim()
    ? req.body.descripcion.trim()
    : undefined;
  const imagen = await equipmentService.saveEquipmentImage(
    Number(req.params.id),
    req.file.path,
    req.user!.userId,
    descripcion,
  );
  res.status(201).json({ imagen });
}

export async function deleteImageHandler(req: Request, res: Response) {
  await equipmentService.deleteEquipmentImage(
    Number(req.params.id),
    Number(req.params.imageId),
    req.user!.userId,
  );
  res.json({ message: 'Imagen eliminada' });
}

export async function updateImageDescriptionHandler(req: Request, res: Response) {
  const descripcion = typeof req.body.descripcion === 'string' && req.body.descripcion.trim()
    ? req.body.descripcion.trim()
    : null;
  const imagen = await equipmentService.updateImageDescription(
    Number(req.params.id),
    Number(req.params.imageId),
    descripcion,
    req.user!.userId,
  );
  res.json({ imagen });
}
