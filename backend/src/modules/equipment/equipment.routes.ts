import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { mkdirSync } from 'fs';
import { authMiddleware } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './equipment.controller.js';
import {
  createEquipmentSchema,
  transferEquipmentSchema,
  sendToSupportSchema,
  sendToServiceSchema,
} from '@proseguit/shared';
import { z } from 'zod';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'equipment');
mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, `${req.params.id}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Solo se permiten imágenes JPEG, PNG o WebP') as any);
  },
});

const router = Router();

router.use(authMiddleware);

const updateSchema = createEquipmentSchema.partial().extend({
  motivo: z.string().min(1),
});

const returnFromServiceSchema = sendToSupportSchema.extend({
  diagnostico: z.string().optional(),
});

const sendToSupportExtSchema = sendToSupportSchema.extend({
  oficinaDestinoId: z.number().int().positive().optional(),
});

// Routes
router.get('/', controller.listHandler);
router.get('/types', controller.typesHandler);
router.get('/next-serie', controller.nextSerieHandler);
router.get('/:id', controller.getByIdHandler);
router.post('/', validate(createEquipmentSchema), controller.createHandler);
router.put('/:id', validate(updateSchema), controller.updateHandler);
router.post('/:id/transfer', validate(transferEquipmentSchema), controller.transferHandler);
router.post('/:id/send-to-support', validate(sendToSupportExtSchema), controller.sendToSupportHandler);
router.post('/:id/send-to-service', validate(sendToServiceSchema), controller.sendToServiceHandler);
router.post('/:id/return-from-service', validate(returnFromServiceSchema), controller.returnFromServiceHandler);
router.post('/:id/image', upload.single('image'), controller.uploadImageHandler);

export default router;
