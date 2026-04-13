# Módulo de Gestión de Licencias — Design Spec
**Fecha:** 2026-04-13
**Estado:** Aprobado

---

## Contexto

PROSEGUIT gestiona inventario de equipos IT. Actualmente no existe registro de qué software tiene licencia en cada equipo. El módulo de Licencias cubre esta necesidad: registrar licencias de software por equipo, con control de expiración y visibilidad global.

---

## Alcance

- Licencias de software **por equipo** (modelo 1 licencia = 1 equipo)
- Datos: nombre del software, versión (opcional), fecha de expiración (opcional), equipo asignado
- Estado derivado en runtime: `VIGENTE` / `POR_VENCER` / `VENCIDA`
- Acceso: ADMIN y TECNICO (mismos permisos que equipos)
- Sin adjuntos, sin costo, sin clave/serial — YAGNI

---

## Modelo de Datos

Nuevo modelo `Licencia` en `schema.prisma`:

```prisma
model Licencia {
  id               Int       @id @default(autoincrement())
  software         String    @db.VarChar(100)
  version          String?   @db.VarChar(50)
  fechaExpiracion  DateTime? @map("fecha_expiracion")
  equipoId         Int       @map("equipo_id")
  equipo           Equipo    @relation(fields: [equipoId], references: [id], onDelete: Cascade)
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")

  @@index([equipoId])
  @@index([fechaExpiracion])
  @@map("licencia")
}
```

Y relación inversa en `Equipo`: `licencias Licencia[]`

**Estado derivado (no guardado en DB):**
- `VIGENTE` — `fechaExpiracion` es null o está a más de 30 días
- `POR_VENCER` — `fechaExpiracion` entre hoy y hoy + 30 días
- `VENCIDA` — `fechaExpiracion` en el pasado

---

## Backend

Módulo `licenses` siguiendo el patrón `routes → controller → service`:

### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/licenses` | Lista paginada con filtros |
| GET | `/api/v1/licenses/summary` | Resumen agrupado por software |
| GET | `/api/v1/licenses/:id` | Detalle de una licencia |
| POST | `/api/v1/licenses` | Crear licencia |
| PUT | `/api/v1/licenses/:id` | Editar licencia |
| DELETE | `/api/v1/licenses/:id` | Eliminar licencia |

**Nota:** `/summary` debe registrarse **antes** de `/:id` en el router para evitar que Express lo interprete como un ID.

### Filtros en GET `/licenses`
- `software` — búsqueda insensible por nombre
- `estado` — `VIGENTE | POR_VENCER | VENCIDA`
- `equipoId` — para la sección de ficha de equipo
- `page`, `limit` — paginación estándar (misma lógica que `parsePagination`)

### Respuesta `GET /licenses/summary`
```json
[
  {
    "software": "Windows 11",
    "total": 12,
    "vigentes": 10,
    "porVencer": 1,
    "vencidas": 1
  }
]
```

### Autenticación
`authMiddleware` en todas las rutas (sin restricción de rol — ADMIN y TECNICO pueden operar).

---

## Frontend

### Página `/licencias` (`LicensesPage.tsx`)

**Sección superior — Resumen por software:**
- Cards compactas: nombre del software, total de licencias, badges con contadores por estado (verde/amarillo/rojo)
- Al hacer clic en una card filtra la tabla inferior por ese software

**Sección inferior — Tabla detallada:**
- Columnas: Software | Versión | Equipo (serie + tipo) | Fecha expiración | Estado (badge) | Acciones
- Búsqueda por software o serie de equipo
- Filtro por estado (`VIGENTE`, `POR_VENCER`, `VENCIDA`)
- Paginación estándar

**Formulario (modal):**
- Campos: nombre software (requerido), versión (opcional), fecha expiración (opcional), equipo (input de número de serie, lookup)
- Modal en la misma página, sin ruta separada

### Ficha de equipo (`EquipmentDetailPage.tsx`)

Nueva sección "Licencias" al final de la ficha:
- Lista las licencias del equipo con badge de estado
- Botón "Agregar licencia" → abre el mismo modal con `equipoId` pre-cargado
- Inline en la página, no redirige

### Sidebar (`Sidebar.tsx`)

Nueva entrada entre "Préstamos" e "Historial":
```ts
{ to: '/licencias', label: 'Licencias', icon: KeyRound }
```
Importar `KeyRound` de `lucide-react`.

### Hooks (`useLicenses.ts`)

- `useLicenses(filters)` — GET lista
- `useLicensesSummary()` — GET summary
- `useEquipmentLicenses(equipoId)` — GET lista filtrada por equipo
- `useCreateLicense()` — POST, invalida `['licenses']`
- `useUpdateLicense()` — PUT, invalida `['licenses']`
- `useDeleteLicense()` — DELETE, invalida `['licenses']`

### Ruta

En `App.tsx`:
```tsx
const LicensesPage = lazy(() => import('./pages/LicensesPage'));
// ...
<Route path="licencias" element={<LicensesPage />} />
```

---

## Convenciones

- CSS Modules sin Tailwind, variables CSS del sistema (`--color-primary`, `--color-warning`, `--color-danger`)
- Badges: `VIGENTE` = verde (`--color-success`), `POR_VENCER` = amarillo (`--color-warning`), `VENCIDA` = rojo (`--color-danger`)
- staleTime: 30s (igual que préstamos)
- Página `/licencias` ocupa todo el ancho (es listado), sin `max-width`
- La lógica de estado derivado va en una función helper en `frontend/src/lib/license-status.ts`

---

## Archivos a crear/modificar

### Crear
- `backend/src/modules/licenses/licenses.routes.ts`
- `backend/src/modules/licenses/licenses.controller.ts`
- `backend/src/modules/licenses/licenses.service.ts`
- `frontend/src/hooks/useLicenses.ts`
- `frontend/src/pages/LicensesPage.tsx`
- `frontend/src/pages/LicensesPage.module.css`
- `frontend/src/lib/license-status.ts`

### Modificar
- `backend/prisma/schema.prisma` — agregar modelo `Licencia` y relación en `Equipo`
- `backend/src/index.ts` — registrar ruta `/api/v1/licenses`
- `frontend/src/App.tsx` — agregar ruta y lazy import
- `frontend/src/components/layout/Sidebar.tsx` — agregar entrada de navegación
- `frontend/src/pages/EquipmentDetailPage.tsx` — agregar sección Licencias
- `frontend/src/pages/EquipmentDetailPage.module.css` — estilos de la sección

### Migración DB
- Nueva migración Prisma: `npm run db:migrate`

---

## Verificación

1. `npm run db:migrate` — migración aplica sin errores
2. Backend: crear licencia via POST, listar, editar, eliminar
3. GET `/summary` agrupa correctamente con contadores
4. Frontend: `/licencias` carga con resumen + tabla
5. Filtro por estado funciona
6. Click en card de resumen filtra tabla
7. Ficha de equipo muestra sección Licencias
8. Agregar licencia desde ficha pre-carga el equipo
9. `npm test` — 48 tests siguen pasando
