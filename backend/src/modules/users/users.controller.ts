import type { Request, Response } from 'express';
import * as usersService from './users.service.js';
import { getAccessContext } from '../access-log/access-log.service.js';

export async function listHandler(_req: Request, res: Response) {
  const data = await usersService.listUsers();
  res.json(data);
}

export async function getByIdHandler(req: Request, res: Response) {
  const data = await usersService.getUserById(Number(req.params.id));
  res.json(data);
}

export async function createHandler(req: Request, res: Response) {
  const data = await usersService.createUser(req.body);
  res.status(201).json(data);
}

export async function updateHandler(req: Request, res: Response) {
  const data = await usersService.updateUser(Number(req.params.id), req.body);
  res.json(data);
}

export async function resetPasswordHandler(req: Request, res: Response) {
  const { tempPassword } = await usersService.resetPassword(Number(req.params.id), req.user!.userId, getAccessContext(req));
  res.json({ message: 'Contraseña reseteada exitosamente', tempPassword });
}

export async function revokeSessionsHandler(req: Request, res: Response) {
  const { count } = await usersService.revokeSessions(Number(req.params.id), req.user!.userId, getAccessContext(req));
  res.json({ message: 'Sesiones cerradas', count });
}

export async function getMeHandler(req: Request, res: Response) {
  const data = await usersService.getUserById(req.user!.userId);
  res.json(data);
}

export async function changePasswordHandler(req: Request, res: Response) {
  await usersService.changePassword(req.user!.userId, req.body, getAccessContext(req));
  res.json({ message: 'Contraseña cambiada exitosamente' });
}
