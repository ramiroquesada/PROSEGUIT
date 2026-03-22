import { Router } from 'express';
import { loginHandler, refreshHandler, logoutHandler } from './auth.controller.js';
import { validate } from '../../middleware/validate.js';
import { z } from 'zod';

const router = Router();

const loginSchema = z.object({
  ficha: z.number({ message: 'La ficha es requerida y debe ser un número' }),
  password: z.string().min(1, 'La contraseña es requerida'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'El refresh token es requerido'),
});

router.post('/login', validate(loginSchema), loginHandler);
router.post('/refresh', validate(refreshSchema), refreshHandler);
router.post('/logout', validate(refreshSchema), logoutHandler);

export default router;
