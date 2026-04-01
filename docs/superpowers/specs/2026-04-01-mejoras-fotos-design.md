# Mejoras de Fotos de Equipos — Spec

**Fecha:** 2026-04-01
**Estado:** Aprobado

---

## Resumen

Completar el módulo de fotos de equipos con: descripción por foto (opcional al subir, editable inline después), soft-delete con preservación de historial, y registro de acciones `FOTO_AGREGADA` / `FOTO_ELIMINADA` / `EDICION` en el historial del equipo.

---

## Estado actual

- Lightbox ✅
- Subida de imágenes (`POST /:id/images`) ✅
- Eliminado hard-delete (`DELETE /:id/images/:imageId`) ✅
- Galería en ficha de equipo ✅
- Descripción por foto ✗
- Soft-delete ✗
- Registro en historial ✗

Las columnas `descripcion` y `deleted_at` en `equipo_imagen` y los enum values `FOTO_AGREGADA` / `FOTO_ELIMINADA` en `accion_tipo` **ya existen en la DB** — solo falta sincronizar `schema.prisma`.

---

## Modelo de datos

Solo cambios en `schema.prisma` — sin migración (las columnas ya existen en DB):

```prisma
model EquipoImagen {
  id        Int      @id @default(autoincrement())
  equipoId  Int      @map("equipo_id")
  equipo    Equipo   @relation(fields: [equipoId], references: [id], onDelete: Cascade)
  url       String   @db.VarChar(500)
  descripcion String? @db.Text
  deletedAt DateTime? @map("deleted_at")
  createdAt DateTime @default(now()) @map("created_at")

  @@index([equipoId])
  @@map("equipo_imagen")
}

enum AccionTipo {
  // ... valores existentes ...
  FOTO_AGREGADA
  FOTO_ELIMINADA
}
```

`getEquipmentById` filtra imágenes con `where: { deletedAt: null }`.

---

## Backend

**Módulo:** `backend/src/modules/equipment/`

### `saveEquipmentImage(equipoId, uploadedFilePath, usuarioId, descripcion?)`

- Crea el registro en `equipo_imagen` con `descripcion` opcional
- Registra `FOTO_AGREGADA` en historial: motivo `"Foto agregada"`
- Retorna la imagen creada

### `deleteEquipmentImage(equipoId, imageId, usuarioId)`

- **Soft-delete:** setea `deletedAt = new Date()`, no borra el archivo de disco
- Registra `FOTO_ELIMINADA` en historial: motivo `"Foto eliminada"`
- Lanza 404 si no encuentra la imagen (con `deletedAt: null`)

### `updateImageDescription(equipoId, imageId, descripcion, usuarioId)`

- Actualiza `descripcion` en `equipo_imagen`
- Registra `EDICION` en historial: motivo `"Descripción de foto actualizada"`
- Lanza 404 si no encuentra la imagen activa
- Si `descripcion` es string vacío, guarda `null`

### Rutas

| Método | Ruta | Cambio |
|--------|------|--------|
| `POST` | `/:id/images` | Agrega campo `descripcion` del body multipart (opcional) |
| `DELETE` | `/:id/images/:imageId` | Soft-delete en lugar de hard-delete |
| `PATCH` | `/:id/images/:imageId` | Nueva — body: `{ descripcion: string }` |

El controller pasa `usuarioId` (del JWT) a todas las funciones del service.

---

## Frontend

### Subida (EquipmentDetailPage)

- Campo `<input type="text" placeholder="Descripción (opcional)">` debajo del trigger de subida
- El valor se envía como campo `descripcion` en el `FormData` junto con el archivo
- Se limpia después de una subida exitosa

### Galería

Cada tile muestra:
1. La imagen (con lightbox al hacer click)
2. Texto de descripción debajo:
   - Si tiene descripción: texto en gris claro
   - Si no tiene: `"+ descripción"` en gris más claro (placeholder clickeable)
3. Botón de eliminar (sin cambio visual)

### Edición inline

- Click en el texto (descripción o placeholder) convierte el elemento en `<textarea>` en foco
- `Escape` cancela y restaura el valor anterior sin llamar a la API
- `blur` (pierde el foco) guarda si el valor cambió; si no cambió, no llama a la API
- Mientras guarda: el textarea queda deshabilitado con opacidad reducida
- Si `descripcion` se borra (string vacío), guarda `null` en el backend
- Error de guardado: muestra un texto rojo debajo del tile por 3 segundos

### Eliminado

Sin cambio visual — el botón de basura sigue igual. El backend ahora hace soft-delete, pero desde el frontend la imagen simplemente desaparece de la galería.

---

## Lo que NO incluye este spec

- Reordenar imágenes (drag & drop)
- Foto principal / cover
- Ver imágenes eliminadas o restaurarlas
