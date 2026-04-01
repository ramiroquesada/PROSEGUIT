# Mejoras de Fotos de Equipos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar descripción editable por foto, soft-delete con historial, y registro de acciones `FOTO_AGREGADA` / `FOTO_ELIMINADA` en el historial del equipo.

**Architecture:** Las columnas `descripcion` y `deleted_at` en `equipo_imagen` y los enum values `FOTO_AGREGADA`/`FOTO_ELIMINADA` en `accion_tipo` ya existen en la DB — solo hay que sincronizar `schema.prisma` y regenerar el cliente Prisma. El backend actualiza tres funciones del service y agrega una ruta PATCH. El frontend agrega un campo de descripción en la subida, edición inline en la galería y un hook nuevo.

**Tech Stack:** Prisma 7, Express 5, React 19, TanStack Query 5, CSS Modules

---

### Task 1: Sincronizar schema.prisma con la DB

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Agregar `descripcion` y `deletedAt` a `EquipoImagen`**

Reemplazar el modelo `EquipoImagen` en `backend/prisma/schema.prisma`:

```prisma
model EquipoImagen {
  id          Int       @id @default(autoincrement())
  equipoId    Int       @map("equipo_id")
  equipo      Equipo    @relation(fields: [equipoId], references: [id], onDelete: Cascade)
  url         String    @db.VarChar(500)
  descripcion String?   @db.Text
  deletedAt   DateTime? @map("deleted_at")
  createdAt   DateTime  @default(now()) @map("created_at")

  @@index([equipoId])
  @@map("equipo_imagen")
}
```

- [ ] **Step 2: Agregar `FOTO_AGREGADA` y `FOTO_ELIMINADA` al enum `AccionTipo`**

En el enum `AccionTipo` en `backend/prisma/schema.prisma`, agregar al final (antes del `@@map`):

```prisma
enum AccionTipo {
  CREACION
  ASIGNACION
  TRANSFERENCIA
  ENVIO_SOPORTE
  RETORNO_SOPORTE
  PRESTAMO
  DEVOLUCION
  CAMBIO_ESTADO
  EDICION
  ENVIO_SERVICIO_EXTERNO
  RETORNO_SERVICIO_EXTERNO
  FOTO_AGREGADA
  FOTO_ELIMINADA

  @@map("accion_tipo")
}
```

- [ ] **Step 3: Regenerar el Prisma Client**

```bash
cd backend && npx prisma generate
```

Resultado esperado: `✔ Generated Prisma Client (v7.5.0)` sin errores.

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma
git commit -m "feat(db): sincronizar schema con descripcion/deletedAt en EquipoImagen y enums FOTO_*"
```

---

### Task 2: Actualizar el service (TDD)

**Files:**
- Modify: `backend/src/modules/equipment/equipment.service.ts`
- Test: `backend/src/modules/equipment/equipment.service.test.ts`

- [ ] **Step 1: Extender el mock de Prisma en el test**

Al inicio de `equipment.service.test.ts`, el `vi.mock` define los mocks de Prisma. Reemplazar la llamada completa a `vi.mock`:

```ts
vi.mock('../../utils/prisma.js', () => ({
  prisma: {
    equipo: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      aggregate: vi.fn(),
    },
    oficina: {
      findUnique: vi.fn(),
    },
    servicioExterno: {
      findUnique: vi.fn(),
    },
    envioServicio: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    equipoImagen: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    historial: {
      create: vi.fn(),
    },
  },
}));
```

Luego actualizar el tipo de `mockPrisma`:

```ts
const mockPrisma = prisma as unknown as {
  equipo: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; aggregate: ReturnType<typeof vi.fn> };
  oficina: { findUnique: ReturnType<typeof vi.fn> };
  servicioExterno: { findUnique: ReturnType<typeof vi.fn> };
  envioServicio: { create: ReturnType<typeof vi.fn>; findFirst: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  equipoImagen: { create: ReturnType<typeof vi.fn>; findFirst: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  historial: { create: ReturnType<typeof vi.fn> };
};
```

- [ ] **Step 2: Agregar el import de las nuevas funciones en el test**

Actualizar la línea de import en el test:

```ts
import { transferEquipment, sendToSupport, createEquipment, getNextSerie, returnFromService, saveEquipmentImage, deleteEquipmentImage, updateImageDescription } from './equipment.service.js';
```

- [ ] **Step 3: Escribir los tests que fallan**

Al final de `equipment.service.test.ts`, agregar:

```ts
// ─── saveEquipmentImage ──────────────────────────────────────────────────────

describe('saveEquipmentImage', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('crea la imagen y registra FOTO_AGREGADA en historial', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, oficinaId: 5 });
    mockPrisma.equipoImagen.create.mockResolvedValue({ id: 10, url: '/uploads/equipment/test.jpg', descripcion: null });
    mockPrisma.historial.create.mockResolvedValue({});

    const result = await saveEquipmentImage(1, '/tmp/uploads/equipment/test.jpg', 99);

    expect(mockPrisma.equipoImagen.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ equipoId: 1, descripcion: undefined }) })
    );
    expect(mockPrisma.historial.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ accion: 'FOTO_AGREGADA', usuarioId: 99, equipoId: 1 }),
      })
    );
    expect(result.id).toBe(10);
  });

  it('pasa la descripcion al crear la imagen', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, oficinaId: 5 });
    mockPrisma.equipoImagen.create.mockResolvedValue({ id: 11, url: '/uploads/equipment/x.jpg', descripcion: 'Vista frontal' });
    mockPrisma.historial.create.mockResolvedValue({});

    await saveEquipmentImage(1, '/tmp/uploads/equipment/x.jpg', 99, 'Vista frontal');

    expect(mockPrisma.equipoImagen.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ descripcion: 'Vista frontal' }) })
    );
  });
});

// ─── deleteEquipmentImage ────────────────────────────────────────────────────

describe('deleteEquipmentImage', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('hace soft-delete y registra FOTO_ELIMINADA en historial', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, oficinaId: 5 });
    mockPrisma.equipoImagen.findFirst.mockResolvedValue({ id: 10, equipoId: 1, url: '/uploads/equipment/test.jpg', deletedAt: null });
    mockPrisma.equipoImagen.update.mockResolvedValue({});
    mockPrisma.historial.create.mockResolvedValue({});

    await deleteEquipmentImage(1, 10, 99);

    expect(mockPrisma.equipoImagen.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 10 },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      })
    );
    expect(mockPrisma.historial.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ accion: 'FOTO_ELIMINADA', usuarioId: 99, equipoId: 1 }),
      })
    );
  });

  it('lanza 404 si la imagen no existe', async () => {
    mockPrisma.equipoImagen.findFirst.mockResolvedValue(null);

    await expect(deleteEquipmentImage(1, 99, 1)).rejects.toThrow('Imagen no encontrada');
  });
});

// ─── updateImageDescription ──────────────────────────────────────────────────

describe('updateImageDescription', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('actualiza la descripcion y registra EDICION en historial', async () => {
    mockPrisma.equipoImagen.findFirst.mockResolvedValue({ id: 10, equipoId: 1, url: '/uploads/equipment/test.jpg', deletedAt: null });
    mockPrisma.equipoImagen.update.mockResolvedValue({ id: 10, descripcion: 'Nueva desc' });
    mockPrisma.historial.create.mockResolvedValue({});

    await updateImageDescription(1, 10, 'Nueva desc', 99);

    expect(mockPrisma.equipoImagen.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 10 }, data: { descripcion: 'Nueva desc' } })
    );
    expect(mockPrisma.historial.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ accion: 'EDICION', usuarioId: 99, equipoId: 1 }),
      })
    );
  });

  it('lanza 404 si la imagen no existe o está eliminada', async () => {
    mockPrisma.equipoImagen.findFirst.mockResolvedValue(null);

    await expect(updateImageDescription(1, 99, 'desc', 1)).rejects.toThrow('Imagen no encontrada');
  });
});
```

- [ ] **Step 4: Correr los tests para verificar que fallan**

```bash
cd backend && npx vitest run src/modules/equipment/equipment.service.test.ts 2>&1 | tail -8
```

Resultado esperado: varios tests fallan con "is not a function" o similar.

- [ ] **Step 5: Implementar los cambios en equipment.service.ts**

Reemplazar `saveEquipmentImage`:

```ts
/** Agrega una nueva imagen al equipo */
export async function saveEquipmentImage(equipoId: number, uploadedFilePath: string, usuarioId: number, descripcion?: string) {
  const equipo = await prisma.equipo.findUnique({ where: { id: equipoId } });
  if (!equipo) {
    await unlink(uploadedFilePath).catch(() => {});
    throw new AppError(404, 'Equipo no encontrado');
  }

  const filename = path.basename(uploadedFilePath);
  const url = `/uploads/equipment/${filename}`;

  const imagen = await prisma.equipoImagen.create({ data: { equipoId, url, descripcion } });

  await prisma.historial.create({
    data: {
      equipoId,
      accion: 'FOTO_AGREGADA',
      usuarioId,
      motivo: 'Foto agregada',
      oficinaDestinoId: equipo.oficinaId,
    },
  });

  return imagen;
}
```

Reemplazar `deleteEquipmentImage`:

```ts
/** Soft-delete de una imagen del equipo */
export async function deleteEquipmentImage(equipoId: number, imageId: number, usuarioId: number) {
  const equipo = await prisma.equipo.findUnique({ where: { id: equipoId } });
  const imagen = await prisma.equipoImagen.findFirst({ where: { id: imageId, equipoId, deletedAt: null } });
  if (!imagen) throw new AppError(404, 'Imagen no encontrada');

  await prisma.equipoImagen.update({ where: { id: imageId }, data: { deletedAt: new Date() } });

  if (equipo) {
    await prisma.historial.create({
      data: {
        equipoId,
        accion: 'FOTO_ELIMINADA',
        usuarioId,
        motivo: 'Foto eliminada',
        oficinaDestinoId: equipo.oficinaId,
      },
    });
  }
}
```

Agregar `updateImageDescription` después de `deleteEquipmentImage`:

```ts
/** Actualiza la descripción de una imagen */
export async function updateImageDescription(equipoId: number, imageId: number, descripcion: string | null, usuarioId: number) {
  const equipo = await prisma.equipo.findUnique({ where: { id: equipoId } });
  const imagen = await prisma.equipoImagen.findFirst({ where: { id: imageId, equipoId, deletedAt: null } });
  if (!imagen) throw new AppError(404, 'Imagen no encontrada');

  const updated = await prisma.equipoImagen.update({ where: { id: imageId }, data: { descripcion } });

  if (equipo) {
    await prisma.historial.create({
      data: {
        equipoId,
        accion: 'EDICION',
        usuarioId,
        motivo: 'Descripción de foto actualizada',
        oficinaDestinoId: equipo.oficinaId,
      },
    });
  }

  return updated;
}
```

En `getEquipmentById`, actualizar el include de `imagenes` para filtrar soft-deleted:

```ts
imagenes: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
```

- [ ] **Step 6: Correr los tests para verificar que pasan**

```bash
cd backend && npx vitest run src/modules/equipment/equipment.service.test.ts 2>&1 | tail -8
```

Resultado esperado: todos los tests pasan (aprox 30 tests).

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/equipment/equipment.service.ts backend/src/modules/equipment/equipment.service.test.ts
git commit -m "feat(equipment): soft-delete, descripcion e historial en imágenes (TDD)"
```

---

### Task 3: Actualizar controller y rutas

**Files:**
- Modify: `backend/src/modules/equipment/equipment.controller.ts`
- Modify: `backend/src/modules/equipment/equipment.routes.ts`

- [ ] **Step 1: Actualizar `uploadImageHandler` en el controller**

Reemplazar el handler actual:

```ts
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
```

- [ ] **Step 2: Actualizar `deleteImageHandler` en el controller**

Reemplazar el handler actual:

```ts
export async function deleteImageHandler(req: Request, res: Response) {
  await equipmentService.deleteEquipmentImage(
    Number(req.params.id),
    Number(req.params.imageId),
    req.user!.userId,
  );
  res.json({ message: 'Imagen eliminada' });
}
```

- [ ] **Step 3: Agregar `updateImageDescriptionHandler` en el controller**

Agregar al final del archivo:

```ts
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
```

- [ ] **Step 4: Agregar la ruta PATCH en equipment.routes.ts**

Agregar después de la ruta DELETE de imágenes:

```ts
router.patch('/:id/images/:imageId', controller.updateImageDescriptionHandler);
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/equipment/equipment.controller.ts backend/src/modules/equipment/equipment.routes.ts
git commit -m "feat(equipment): controller y ruta PATCH para actualizar descripción de foto"
```

---

### Task 4: Frontend — constantes y hooks

**Files:**
- Modify: `frontend/src/lib/action-types.ts`
- Modify: `frontend/src/hooks/useEquipment.ts`

- [ ] **Step 1: Agregar FOTO_AGREGADA y FOTO_ELIMINADA a action-types.ts**

En `ACCION_LABEL`, agregar:

```ts
  FOTO_AGREGADA: 'Foto agregada',
  FOTO_ELIMINADA: 'Foto eliminada',
```

En `ACCION_COLOR`, agregar:

```ts
  FOTO_AGREGADA: 'info',
  FOTO_ELIMINADA: 'neutral',
```

No agregar a `ACCION_OPTIONS` — las fotos no se filtran en el historial global por ahora.

- [ ] **Step 2: Actualizar el tipo local de imagen en useEquipment.ts**

Buscar la definición del tipo local del equipo en `useEquipment.ts` (cerca de la línea 72):

```ts
imagenes: { id: number; url: string; createdAt: string }[];
```

Cambiarla por:

```ts
imagenes: { id: number; url: string; descripcion: string | null; createdAt: string }[];
```

- [ ] **Step 3: Actualizar useUploadEquipmentImage para aceptar descripcion**

Reemplazar la función `useUploadEquipmentImage`:

```ts
export function useUploadEquipmentImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file, descripcion }: { id: number; file: File; descripcion?: string }) => {
      const formData = new FormData();
      formData.append('image', file);
      if (descripcion) formData.append('descripcion', descripcion);
      return api.upload<{ imagen: { id: number; url: string; descripcion: string | null; createdAt: string } }>(`/equipment/${id}/images`, formData);
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['equipment', id] });
    },
  });
}
```

- [ ] **Step 4: Agregar useUpdateImageDescription**

Agregar después de `useDeleteEquipmentImage`:

```ts
export function useUpdateImageDescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ equipoId, imageId, descripcion }: { equipoId: number; imageId: number; descripcion: string | null }) =>
      api.patch<{ imagen: { id: number; descripcion: string | null } }>(`/equipment/${equipoId}/images/${imageId}`, { descripcion }),
    onSuccess: (_data, { equipoId }) => {
      qc.invalidateQueries({ queryKey: ['equipment', equipoId] });
    },
  });
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/action-types.ts frontend/src/hooks/useEquipment.ts
git commit -m "feat(frontend): labels FOTO_*, hook useUpdateImageDescription"
```

---

### Task 5: Frontend — UI y CSS

**Files:**
- Modify: `frontend/src/pages/EquipmentDetailPage.tsx`
- Modify: `frontend/src/pages/EquipmentDetailPage.module.css`

- [ ] **Step 1: Agregar import de useUpdateImageDescription en EquipmentDetailPage.tsx**

Actualizar la línea de import de hooks de equipo:

```ts
import { useEquipmentDetail, useTransferEquipment, useSendToSupport, useSendToService, useReturnFromService, useUploadEquipmentImage, useDeleteEquipmentImage, useUpdateImageDescription } from '../hooks/useEquipment';
```

- [ ] **Step 2: Agregar el componente ImageDescription antes de la función principal**

Agregar antes de `export default function EquipmentDetailPage()`:

```tsx
function ImageDescription({ imageId, equipoId, descripcion }: { imageId: number; equipoId: number; descripcion: string | null }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(descripcion ?? '');
  const [saveError, setSaveError] = useState('');
  const updateMutation = useUpdateImageDescription();

  function handleBlur() {
    const trimmed = value.trim();
    if (trimmed === (descripcion ?? '')) { setEditing(false); return; }
    updateMutation.mutate(
      { equipoId, imageId, descripcion: trimmed || null },
      {
        onSuccess: () => setEditing(false),
        onError: (err: any) => {
          setSaveError(err?.message || 'Error al guardar');
          setTimeout(() => setSaveError(''), 3000);
          setEditing(false);
        },
      },
    );
  }

  if (editing) {
    return (
      <textarea
        className={styles.descEdit}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => { if (e.key === 'Escape') { setValue(descripcion ?? ''); setEditing(false); } }}
        disabled={updateMutation.isPending}
        autoFocus
        rows={2}
      />
    );
  }

  return (
    <>
      <span
        className={`${styles.descText} ${!descripcion ? styles.descPlaceholder : ''}`}
        onClick={() => { setValue(descripcion ?? ''); setEditing(true); }}
        title="Click para editar descripción"
      >
        {descripcion || '+ descripción'}
      </span>
      {saveError && <span className={styles.descError}>{saveError}</span>}
    </>
  );
}
```

- [ ] **Step 3: Agregar el campo de descripción en la subida**

En `EquipmentDetailPage`, agregar estado para la descripción de subida. Agregar junto a los otros `useState`:

```ts
const [uploadDesc, setUploadDesc] = useState('');
```

- [ ] **Step 4: Actualizar handleImageChange para pasar descripcion**

Reemplazar la función `handleImageChange`:

```ts
function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file) return;
  uploadImageMutation.mutate({ id: equipoId, file, descripcion: uploadDesc || undefined });
  setUploadDesc('');
  e.target.value = '';
}
```

- [ ] **Step 5: Actualizar el JSX de la sección de imágenes**

Reemplazar el bloque `<div className={styles.imageSection}>` completo (desde la apertura hasta el cierre) con:

```tsx
          <div className={styles.imageSection}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className={styles.imageInput}
              onChange={handleImageChange}
            />
            <div className={styles.uploadRow}>
              <input
                type="text"
                className={styles.descInput}
                value={uploadDesc}
                onChange={(e) => setUploadDesc(e.target.value)}
                placeholder="Descripción (opcional)"
                disabled={uploadImageMutation.isPending}
              />
              <button
                type="button"
                className={styles.uploadBtn}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadImageMutation.isPending}
              >
                <Camera size={14} />
                {uploadImageMutation.isPending ? 'Subiendo...' : 'Agregar foto'}
              </button>
            </div>

            {equipo.imagenes.length > 0 && (
              <div className={styles.imageGallery}>
                {equipo.imagenes.map((img) => (
                  <div key={img.id} className={styles.imageTile}>
                    <div className={styles.imageTileImgWrapper}>
                      <img
                        src={img.url}
                        alt={img.descripcion || `Equipo serie ${equipo.serie}`}
                        className={styles.imageTileImg}
                        onClick={() => setLightboxUrl(img.url)}
                      />
                      <button
                        className={styles.imageDeleteBtn}
                        onClick={() => deleteImageMutation.mutate({ equipoId, imageId: img.id })}
                        disabled={deleteImageMutation.isPending}
                        title="Eliminar foto"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <ImageDescription
                      imageId={img.id}
                      equipoId={equipoId}
                      descripcion={img.descripcion}
                    />
                  </div>
                ))}
              </div>
            )}
            {equipo.imagenes.length === 0 && !uploadImageMutation.isPending && (
              <p className={styles.noImages}>Sin fotos. Usá el campo de arriba para agregar la primera.</p>
            )}
            {uploadImageMutation.isError && (
              <p className={styles.imageError}>{(uploadImageMutation.error as Error).message}</p>
            )}
          </div>
```

- [ ] **Step 6: Actualizar los estilos en EquipmentDetailPage.module.css**

Reemplazar el bloque `.imageTile` y sus hijos:

```css
.imageTile {
  display: flex;
  flex-direction: column;
  width: 120px;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-bg-secondary);

  &:hover .imageDeleteBtn {
    opacity: 1;
  }
}

.imageTileImgWrapper {
  position: relative;
  width: 120px;
  height: 100px;
  flex-shrink: 0;
}
```

Actualizar `.imageTileImg` para que ocupe el wrapper en vez del tile:

```css
.imageTileImg {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
  display: block;
  transition: opacity 0.15s;

  &:hover { opacity: 0.9; }
}
```

Agregar los estilos nuevos después de `.imageError`:

```css
.uploadRow {
  display: flex;
  gap: var(--space-sm);
  align-items: center;
  flex-wrap: wrap;
}

.descInput {
  flex: 1;
  min-width: 160px;
  padding: var(--space-xs) var(--space-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  background: var(--color-bg);
  color: var(--color-text);
  outline: none;

  &:focus { border-color: var(--color-primary); }
  &:disabled { opacity: 0.6; }
}

.uploadBtn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-md);
  border: none;
  border-radius: var(--radius-md);
  background: var(--color-primary);
  color: white;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;

  &:hover { background: var(--color-primary-hover, var(--color-primary)); }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
}

.descText {
  display: block;
  padding: 4px 6px;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  cursor: pointer;
  line-height: 1.3;
  word-break: break-word;
  min-height: 24px;

  &:hover { background: var(--color-bg-hover, var(--color-bg-secondary)); }
}

.descPlaceholder {
  color: var(--color-text-tertiary);
  font-style: italic;
}

.descEdit {
  display: block;
  width: 100%;
  padding: 4px 6px;
  font-size: var(--font-size-xs);
  border: 1px solid var(--color-primary);
  border-radius: 0 0 var(--radius-md) var(--radius-md);
  resize: none;
  background: var(--color-bg);
  color: var(--color-text);
  outline: none;
  box-sizing: border-box;

  &:disabled { opacity: 0.6; }
}

.descError {
  display: block;
  padding: 2px 6px;
  font-size: var(--font-size-xs);
  color: var(--color-danger);
}

.noImages {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin: 0;
}
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/EquipmentDetailPage.tsx frontend/src/pages/EquipmentDetailPage.module.css
git commit -m "feat(detail): descripción de foto editable inline con historial"
```

---

### Task 6: Verificación final

**Files:** ninguno nuevo

- [ ] **Step 1: Correr todos los tests del backend**

```bash
cd backend && npx vitest run
```

Resultado esperado: todos los tests pasan (aprox 48+).

- [ ] **Step 2: Verificar TypeScript del frontend**

```bash
cd ../frontend && npx tsc --noEmit
```

Resultado esperado: sin errores.

- [ ] **Step 3: Actualizar CLAUDE.md**

En la sección `### Corto plazo` de `CLAUDE.md`, cambiar:

```
- [ ] **Mejoras de fotos de equipos** — las fotos múltiples ya funcionan; pendiente:
  - Lightbox (click en imagen la muestra ampliada)
  - Descripción por foto (texto opcional al subir, editable después)
  - Soft-delete (ocultar sin borrar de DB, mantener referencia histórica)
  - Registro en historial al agregar/eliminar foto (`FOTO_AGREGADA`, `FOTO_ELIMINADA`)
  - Nota: las columnas `descripcion` y `deleted_at` en `equipo_imagen` y los enum values en la DB **ya existen** — faltan schema.prisma + prisma generate + backend + frontend
```

Por:

```
- [x] **Mejoras de fotos de equipos** — lightbox, descripción por foto editable inline, soft-delete, registro en historial (`FOTO_AGREGADA`, `FOTO_ELIMINADA`)
```

```bash
git add CLAUDE.md
git commit -m "docs: marcar mejoras de fotos como completado"
```
