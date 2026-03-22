import type { Request, Response } from 'express';
import * as usersService from './users.service.js';

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
  await usersService.resetPassword(Number(req.params.id));
  res.json({ message: 'Contraseña reseteada exitosamente' });
}

export async function changePasswordHandler(req: Request, res: Response) {
  await usersService.changePassword(req.user!.userId, req.body);
  res.json({ message: 'Contraseña cambiada exitosamente' });
}
