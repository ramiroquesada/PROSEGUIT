# Ciclo de Vida del Activo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar `fechaFinVida` y `precioCompra` al modelo Equipo, y mejorar la visualización de garantía en la ficha con badge de días restantes.

**Architecture:** `fechaAdquisicion` y `garantiaHasta` ya existen en schema, Zod, form y detail. Este plan agrega los dos campos faltantes en todas las capas y mejora el badge de garantía en el detail con un helper `getWarrantyStatus` reutilizable para el futuro módulo de alertas.

**Tech Stack:** Prisma 7, Zod 4, Express 5, React 19, CSS Modules

---

### Task 1: Agregar campos al schema Prisma

**Files:**
- Modify: `backend/prisma/schema.prisma` — agregar `fechaFinVida` y `precioCompra` al modelo `Equipo`

- [ ] **Step 1: Agregar los campos en schema.prisma**

En el modelo `Equipo`, después de la línea `garantiaHasta    DateTime?      @map("garantia_hasta")`, agregar:

```prisma
  fechaFinVida     DateTime?      @map("fecha_fin_vida")
  precioCompra     Decimal?       @map("precio_compra") @db.Decimal(10, 2)
```

- [ ] **Step 2: Correr la migración**

```bash
cd backend && npx prisma migrate dev --name add_ciclo_vida_activo
```

Resultado esperado: `✓ Generated Prisma Client` y un nuevo directorio en `backend/prisma/migrations/`.

- [ ] **Step 3: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat(db): agregar fechaFinVida y precioCompra a Equipo"
```

---

### Task 2: Actualizar schema Zod compartido

**Files:**
- Modify: `packages/shared/src/schemas/equipment.ts`

- [ ] **Step 1: Agregar los dos campos al schema Zod**

En `createEquipmentSchema`, después de `garantiaHasta: z.coerce.date().optional().nullable()`, agregar:

```ts
  fechaFinVida: z.coerce.date().optional().nullable(),
  precioCompra: z.number().positive().optional().nullable(),
```

El schema `updateEquipmentSchema` es `.partial()` de `createEquipmentSchema` — se actualiza automáticamente.

- [ ] **Step 2: Actualizar la interfaz `Equipment` en types**

En `packages/shared/src/types/equipment.ts`, reemplazar la interfaz `Equipment` con los campos faltantes:

```ts
export interface Equipment {
  id: number;
  serie: number;
  modelo: string | null;
  templateId: number | null;
  tipoEquipoId: number;
  oficinaId: number;
  estado: EquipmentStatus;
  ip: string | null;
  mac: string | null;
  matricula: string | null;
  asignadoA: string | null;
  proveedor: string | null;
  nroInventario: string | null;
  fechaAdquisicion: string | null;
  garantiaHasta: string | null;
  fechaFinVida: string | null;
  precioCompra: string | null;
  observacion: string | null;
  especificaciones: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  tipoEquipo?: EquipmentType;
  oficina?: Office;
  template?: ModelTemplate | null;
  imagenes?: { id: number; url: string }[];
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/schemas/equipment.ts packages/shared/src/types/equipment.ts
git commit -m "feat(shared): agregar fechaFinVida y precioCompra a schema y tipo Equipment"
```

---

### Task 3: Actualizar el service de backend (TDD)

**Files:**
- Modify: `backend/src/modules/equipment/equipment.service.ts`
- Test: `backend/src/modules/equipment/equipment.service.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Al final del archivo `equipment.service.test.ts`, agregar:

```ts
// ─── createEquipment — campos de ciclo de vida ──────────────────────────────

describe('createEquipment — campos de ciclo de vida', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('persiste fechaFinVida y precioCompra cuando se proveen', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue(null);
    mockPrisma.equipo.create.mockResolvedValue({
      id: 1,
      tipoEquipo: { id: 1, nombre: 'PC' },
      oficina: { id: 1, nombre: 'Soporte', seccion: { ciudad: {} } },
    });

    await createEquipment(
      {
        serie: 999,
        tipoEquipoId: 1,
        oficinaId: 1,
        fechaFinVida: new Date('2030-01-01'),
        precioCompra: 25000,
      },
      1,
    );

    expect(mockPrisma.equipo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fechaFinVida: new Date('2030-01-01'),
          precioCompra: 25000,
        }),
      }),
    );
  });

  it('acepta fechaFinVida y precioCompra como null', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue(null);
    mockPrisma.equipo.create.mockResolvedValue({
      id: 2,
      tipoEquipo: { id: 1, nombre: 'PC' },
      oficina: { id: 1, nombre: 'Soporte', seccion: { ciudad: {} } },
    });

    await createEquipment({ serie: 1000, tipoEquipoId: 1, oficinaId: 1 }, 1);

    expect(mockPrisma.equipo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fechaFinVida: undefined,
          precioCompra: undefined,
        }),
      }),
    );
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

```bash
cd backend && npx vitest run src/modules/equipment/equipment.service.test.ts
```

Resultado esperado: los dos tests nuevos fallan con error de tipo o "fechaFinVida is not a property".

- [ ] **Step 3: Actualizar createEquipment en el service**

En `equipment.service.ts`, en la firma de `createEquipment`, después de `garantiaHasta?: Date | null;`, agregar:

```ts
  fechaFinVida?: Date | null;
  precioCompra?: number | null;
```

En el `prisma.equipo.create({ data: { ... } })`, después de `garantiaHasta: data.garantiaHasta,`, agregar:

```ts
      fechaFinVida: data.fechaFinVida,
      precioCompra: data.precioCompra,
```

- [ ] **Step 4: Actualizar updateEquipment en el service**

En la firma de `updateEquipment`, después de `garantiaHasta?: Date | null;`, agregar:

```ts
  fechaFinVida?: Date | null;
  precioCompra?: number | null;
```

En el `prisma.equipo.update({ data: { ... } })`, después de `garantiaHasta: data.garantiaHasta,`, agregar:

```ts
        fechaFinVida: data.fechaFinVida,
        precioCompra: data.precioCompra,
```

- [ ] **Step 5: Correr los tests para verificar que pasan**

```bash
cd backend && npx vitest run src/modules/equipment/equipment.service.test.ts
```

Resultado esperado: todos los tests pasan (42 tests).

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/equipment/equipment.service.ts backend/src/modules/equipment/equipment.service.test.ts
git commit -m "feat(equipment): aceptar fechaFinVida y precioCompra en create/update"
```

---

### Task 4: Helper de estado de garantía en el frontend

**Files:**
- Modify: `frontend/src/lib/equipment-status.ts`

- [ ] **Step 1: Agregar el helper al final del archivo**

```ts
export type WarrantyStatus = 'expired' | 'expiring-soon' | 'valid' | null;

/**
 * Retorna el estado de garantía basado en la fecha de fin.
 * - 'expired': la fecha ya pasó
 * - 'expiring-soon': vence en 30 días o menos
 * - 'valid': vence en más de 30 días
 * - null: sin fecha de garantía
 */
export function getWarrantyStatus(fechaFinGarantia: string | null): WarrantyStatus {
  if (!fechaFinGarantia) return null;
  const now = new Date();
  const end = new Date(fechaFinGarantia);
  if (end < now) return 'expired';
  const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 30) return 'expiring-soon';
  return 'valid';
}

/**
 * Retorna los días restantes de garantía (negativo si ya venció).
 */
export function getWarrantyDaysLeft(fechaFinGarantia: string | null): number | null {
  if (!fechaFinGarantia) return null;
  const now = new Date();
  const end = new Date(fechaFinGarantia);
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/lib/equipment-status.ts
git commit -m "feat(frontend): agregar helper getWarrantyStatus y getWarrantyDaysLeft"
```

---

### Task 5: Actualizar EquipmentFormPage

**Files:**
- Modify: `frontend/src/pages/EquipmentFormPage.tsx`

- [ ] **Step 1: Agregar campos al estado del formulario**

En el `useState` del form, después de `garantiaHasta: '',`, agregar:

```ts
    fechaFinVida: '',
    precioCompra: '',
```

- [ ] **Step 2: Pre-rellenar en edición**

En el `useEffect` que hace `setForm` al editar (el que depende de `[equipo, isEditing]`), después de `garantiaHasta: equipo.garantiaHasta ? equipo.garantiaHasta.slice(0, 10) : '',`, agregar:

```ts
        fechaFinVida: equipo.fechaFinVida ? equipo.fechaFinVida.slice(0, 10) : '',
        precioCompra: equipo.precioCompra ? String(equipo.precioCompra) : '',
```

- [ ] **Step 3: Incluir en el payload de submit**

En la función `handleSubmit`, dentro del objeto `payload`, después de `garantiaHasta: form.garantiaHasta || null,`, agregar:

```ts
      fechaFinVida: form.fechaFinVida || null,
      precioCompra: form.precioCompra ? Number(form.precioCompra) : null,
```

- [ ] **Step 4: Agregar campos al JSX**

En la sección "Datos adicionales", dentro del `<div className={styles.grid2}>`, después del campo `garantiaHasta`, agregar:

```tsx
            <div className={styles.field}>
              <label className={styles.label}>Fin de vida estimado</label>
              <input
                type="date"
                name="fechaFinVida"
                value={form.fechaFinVida}
                onChange={handleChange}
                className={styles.input}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Precio de compra ($)</label>
              <input
                type="number"
                name="precioCompra"
                value={form.precioCompra}
                onChange={handleChange}
                className={styles.input}
                placeholder="Ej: 25000"
                min="0"
                step="0.01"
              />
            </div>
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/EquipmentFormPage.tsx
git commit -m "feat(form): agregar campos fechaFinVida y precioCompra"
```

---

### Task 6: Actualizar EquipmentDetailPage y CSS

**Files:**
- Modify: `frontend/src/pages/EquipmentDetailPage.tsx`
- Modify: `frontend/src/pages/EquipmentDetailPage.module.css`

- [ ] **Step 1: Importar los helpers en EquipmentDetailPage.tsx**

En la línea de import de `equipment-status`, agregar `getWarrantyStatus` y `getWarrantyDaysLeft`:

```ts
import { resolveEstado, STATUS_LABEL, STATUS_COLOR, getWarrantyStatus, getWarrantyDaysLeft } from '../lib/equipment-status';
```

- [ ] **Step 2: Reemplazar el bloque de garantiaHasta en el detail**

Reemplazar el bloque actual:

```tsx
            {equipo.garantiaHasta && (
              <div className={styles.detailRow}>
                <dt>Garantía hasta</dt>
                <dd className={new Date(equipo.garantiaHasta) < new Date() ? styles.garantiaVencida : styles.garantiaVigente}>
                  {new Date(equipo.garantiaHasta).toLocaleDateString('es-UY')}
                  {new Date(equipo.garantiaHasta) < new Date() ? ' (vencida)' : ''}
                </dd>
              </div>
            )}
```

Por:

```tsx
            {equipo.garantiaHasta && (() => {
              const wStatus = getWarrantyStatus(equipo.garantiaHasta);
              const daysLeft = getWarrantyDaysLeft(equipo.garantiaHasta);
              return (
                <div className={styles.detailRow}>
                  <dt>Garantía hasta</dt>
                  <dd>
                    <span className={wStatus === 'expired' ? styles.garantiaVencida : wStatus === 'expiring-soon' ? styles.garantiaProxima : styles.garantiaVigente}>
                      {new Date(equipo.garantiaHasta).toLocaleDateString('es-UY')}
                    </span>
                    {wStatus === 'expired' && (
                      <span className={`${styles.warrantyBadge} ${styles.warrantyBadgeExpired}`}>Vencida</span>
                    )}
                    {wStatus === 'expiring-soon' && daysLeft !== null && (
                      <span className={`${styles.warrantyBadge} ${styles.warrantyBadgeWarn}`}>
                        Vence en {daysLeft} día{daysLeft !== 1 ? 's' : ''}
                      </span>
                    )}
                  </dd>
                </div>
              );
            })()}
```

- [ ] **Step 3: Agregar fechaFinVida y precioCompra en el detail**

Después del bloque de `garantiaHasta`, agregar:

```tsx
            {equipo.fechaFinVida && (
              <div className={styles.detailRow}>
                <dt>Fin de vida est.</dt>
                <dd>{new Date(equipo.fechaFinVida).toLocaleDateString('es-UY')}</dd>
              </div>
            )}
            {equipo.precioCompra && (
              <div className={styles.detailRow}>
                <dt>Precio de compra</dt>
                <dd>$ {Number(equipo.precioCompra).toLocaleString('es-UY')}</dd>
              </div>
            )}
```

- [ ] **Step 4: Agregar estilos en EquipmentDetailPage.module.css**

Después de `.garantiaVigente { ... }`, agregar:

```css
.garantiaProxima {
  color: var(--color-warning);
  font-weight: var(--font-weight-semibold);
}

.warrantyBadge {
  display: inline-block;
  margin-left: var(--space-xs);
  padding: 1px 8px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  vertical-align: middle;
}

.warrantyBadgeExpired {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}

.warrantyBadgeWarn {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/EquipmentDetailPage.tsx frontend/src/pages/EquipmentDetailPage.module.css
git commit -m "feat(detail): badge de garantía con días restantes, fechaFinVida y precioCompra"
```

---

### Task 7: Verificación final

- [ ] **Step 1: Correr todos los tests del backend**

```bash
cd backend && npx vitest run
```

Resultado esperado: 42 tests pasan, 0 fallan.

- [ ] **Step 2: Build de TypeScript (verificar que no hay errores de tipos)**

```bash
cd .. && npm run build
```

O si no hay script de build general:

```bash
cd frontend && npx tsc --noEmit
cd ../backend && npx tsc --noEmit
```

Resultado esperado: sin errores de compilación.

- [ ] **Step 3: Commit final de documentación**

Actualizar el TODO en `CLAUDE.md` — marcar el item de ciclo de vida como completado:

Cambiar en CLAUDE.md:
```
- [ ] **Ciclo de vida del activo** — agregar campos a `Equipo`...
```
Por:
```
- [x] **Ciclo de vida del activo** — `fechaFinVida`, `precioCompra` + badge de garantía en ficha
```

```bash
git add CLAUDE.md
git commit -m "docs: marcar ciclo de vida del activo como completado"
```
