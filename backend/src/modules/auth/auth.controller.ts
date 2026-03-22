import type { Request, Response } from 'express';
import * as authService from './auth.service.js';

export async function loginHandler(req: Request, res: Response) {
  const { ficha, password } = req.body;
  const result = await authService.login(ficha, password);
  res.json(result);
}

export async function refreshHandler(req: Request, res: Response) {
  const { refreshToken } = req.body;
  const result = await authService.refreshAccessToken(refreshToken);
  res.json(result);
}

export async function logoutHandler(req: Request, res: Response) {
  const { refreshToken } = req.body;
  await authService.logout(refreshToken);
  res.json({ message: 'Sesión cerrada' });
}
