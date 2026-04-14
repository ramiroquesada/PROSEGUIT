# Equipment Templates Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable users to optionally assign model templates to equipment, viewing template data as reference while maintaining independent equipment records.

**Architecture:** 
- Backend validates that `templateId` belongs to the selected `tipoEquipoId` on create/update
- Frontend adds optional template selector dropdown in equipment form, displaying template reference data (marca, especificaciones) without auto-filling fields
- Template reference card shows data read-only below the selector
- Eliminación de plantillas maintains existing validation: prevents deletion if equipos reference it

**Tech Stack:** React 19, TanStack Query, Express 5, Prisma 7, CSS Modules, Zod validation

---

## File Structure

**Backend Changes:**
- `backend/src/modules/equipment/equipment.service.ts` — add templateId validation in createEquipment/updateEquipment
- `backend/src/modules/model-templates/model-templates.service.ts` — already complete, no changes needed

**Frontend Changes:**
- `frontend/src/hooks/useEquipment.ts` — add `useTemplates(tipoEquipoId)` hook
- `frontend/src/pages/EquipmentFormPage.tsx` — add template selector + reference card
- `frontend/src/pages/EquipmentFormPage.module.css` — add styles for reference card
- `packages/shared/src/schemas/equipment.ts` — add `templateId` to update schema

**Tests:**
- `backend/src/modules/equipment/equipment.service.test.ts` — add tests for templateId validation

---

## Tasks

### Task 1: Add templateId validation in backend createEquipment

**Files:**
- Modify: `backend/src/modules/equipment/equipment.service.ts:168-220` (createEquipment function)

**Context:** The function already accepts `templateId`, but doesn't validate that it belongs to the correct equipment type. Add validation to prevent assigning a PC template to a Printer equipment.

- [ ] **Step 1: Read the current createEquipment function to understand structure**

Run: `head -n 220 backend/src/modules/equipment/equipment.service.ts | tail -n 60`

This shows the createEquipment function signature and current logic.

- [ ] **Step 2: Add templateId validation in createEquipment**

Find the createEquipment function (around line 168) and modify it to validate templateId:

```typescript
export async function createEquipment(data: {
  serie: number;
  modelo?: string;
  templateId?: number;
  tipoEquipoId: number;
  oficinaId: number;
  ip?: string;
  mac?: string;
  matricula?: string;
  asignadoA?: string;
  proveedor?: string;
  fechaAdquisicion?: Date | null;
  nroInventario?: string;
  garantiaHasta?: Date | null;
  fechaFinVida?: Date | null;
  precioCompra?: number | null;
  observacion?: string;
  especificaciones?: Prisma.InputJsonValue;
}, usuarioId: number) {
  const existing = await prisma.equipo.findUnique({ where: { serie: data.serie } });
  if (existing) throw new AppError(409, 'Ya existe un equipo con ese número de serie');

  if (data.matricula) {
    const dup = await prisma.equipo.findUnique({ where: { matricula: data.matricula } });
    if (dup) throw new AppError(409, 'Ya existe un equipo con esa matrícula');
  }

  // Validate templateId if provided
  if (data.templateId) {
    const template = await prisma.modeloTemplate.findUnique({
      where: { id: data.templateId },
    });
    if (!template) throw new AppError(404, 'Plantilla no encontrada');
    if (template.tipoEquipoId !== data.tipoEquipoId) {
      throw new AppError(400, 'La plantilla no corresponde al tipo de equipo seleccionado');
    }
  }

  const equipo = await prisma.equipo.create({
    data: {
      serie: data.serie,
      modelo: data.modelo,
      templateId: data.templateId,
      tipoEquipoId: data.tipoEquipoId,
      // ... rest of fields
    },
    // ... include statement
  });

  return equipo;
}
```

- [ ] **Step 3: Add templateId validation in updateEquipment**

Find the updateEquipment function (around line 240) and add similar validation:

```typescript
export async function updateEquipment(
  id: number,
  data: {
    tipoEquipoId?: number;
    templateId?: number;
    modelo?: string;
    // ... other fields
  },
  usuarioId: number,
) {
  const existing = await prisma.equipo.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'Equipo no encontrado');

  if (data.matricula && data.matricula !== existing.matricula) {
    const dup = await prisma.equipo.findUnique({ where: { matricula: data.matricula } });
    if (dup) throw new AppError(409, 'Ya existe un equipo con esa matrícula');
  }

  // Determine the tipoEquipoId to validate against
  const finalTipoEquipoId = data.tipoEquipoId ?? existing.tipoEquipoId;

  // Validate templateId if provided
  if (data.templateId !== undefined) {
    if (data.templateId !== null) {
      const template = await prisma.modeloTemplate.findUnique({
        where: { id: data.templateId },
      });
      if (!template) throw new AppError(404, 'Plantilla no encontrada');
      if (template.tipoEquipoId !== finalTipoEquipoId) {
        throw new AppError(400, 'La plantilla no corresponde al tipo de equipo seleccionado');
      }
    }
  }

  const equipo = await prisma.equipo.update({
    where: { id },
    data: {
      ...(data.tipoEquipoId !== undefined && { tipoEquipoId: data.tipoEquipoId }),
      ...(data.templateId !== undefined && { templateId: data.templateId }),
      // ... other fields
    },
    // ... include statement
  });

  return equipo;
}
```

- [ ] **Step 4: Run existing tests to ensure no regressions**

Run: `cd backend && npm test -- equipment.service.test.ts`

Expected: All existing tests pass (no new failures).

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/equipment/equipment.service.ts
git commit -m "feat: validate templateId matches tipoEquipoId in createEquipment/updateEquipment"
```

---

### Task 2: Add templateId to update schema in Zod

**Files:**
- Modify: `packages/shared/src/schemas/equipment.ts:23` (updateEquipmentSchema)

- [ ] **Step 1: Read current updateEquipmentSchema**

Run: `cat packages/shared/src/schemas/equipment.ts`

- [ ] **Step 2: Add templateId field to updateEquipmentSchema**

The createEquipmentSchema already has templateId (line 6). Just verify updateEquipmentSchema inherits it via `.partial()`:

```typescript
export const updateEquipmentSchema = createEquipmentSchema.partial();
```

Since createEquipmentSchema already includes `templateId: z.number().int().optional()` at line 6, the updateEquipmentSchema will automatically include it. **No changes needed** — the schema already supports templateId in updates.

Verify by reading line 6:
```typescript
templateId: z.number().int().optional(),
```

- [ ] **Step 3: Commit (only if verified, else skip)**

If you found the field already present:

```bash
git add packages/shared/src/schemas/equipment.ts
git commit -m "docs: verify templateId already in updateEquipmentSchema"
```

If verification shows it's missing, add it:
```typescript
export const createEquipmentSchema = z.object({
  serie: z.number().int().positive('El número de serie es obligatorio'),
  modelo: z.string().optional(),
  templateId: z.number().int().optional(),  // ← ensure this line exists
  tipoEquipoId: z.number().int().positive('El tipo de equipo es obligatorio'),
  // ... rest
});
```

Then commit:
```bash
git add packages/shared/src/schemas/equipment.ts
git commit -m "feat: add templateId to equipment schemas"
```

---

### Task 3: Create useTemplates hook in frontend

**Files:**
- Modify: `frontend/src/hooks/useEquipment.ts` — add useTemplates hook

- [ ] **Step 1: Read the current useEquipment hooks file**

Run: `cat frontend/src/hooks/useEquipment.ts`

This shows the existing hook patterns (useQuery, staleTime, etc.).

- [ ] **Step 2: Add useTemplates hook to the file**

Add this new hook at the end of the file, following the existing pattern:

```typescript
export function useTemplates(tipoEquipoId?: number) {
  const params = tipoEquipoId ? `?tipoEquipoId=${tipoEquipoId}` : '';
  return useQuery({
    queryKey: ['templates', tipoEquipoId],
    queryFn: () => api.get<Template[]>(`/model-templates${params}`),
    staleTime: 30 * 1000, // 30 seconds, consistent with other hooks
  });
}
```

Add this TypeScript interface at the top of the file (after other imports):

```typescript
export interface Template {
  id: number;
  nombre: string;
  marca: string | null;
  tipoEquipo: { id: number; nombre: string };
  especificaciones: Record<string, unknown> | null;
}
```

- [ ] **Step 3: Verify the hook follows the established pattern**

Compare against `useEquipment()` or `useEquipmentDetail()` in the same file:
- Uses `useQuery` ✓
- Has `queryKey` array ✓
- Has `queryFn` with api.get ✓
- Has `staleTime` configured ✓

- [ ] **Step 4: Commit**

```bash
git add frontend/src/hooks/useEquipment.ts
git commit -m "feat: add useTemplates hook to fetch templates by equipment type"
```

---

### Task 4: Add template reference card component styles to EquipmentFormPage CSS

**Files:**
- Modify: `frontend/src/pages/EquipmentFormPage.module.css`

- [ ] **Step 1: Read current EquipmentFormPage.module.css**

Run: `cat frontend/src/pages/EquipmentFormPage.module.css`

This shows the existing CSS structure and variables used.

- [ ] **Step 2: Add template reference card styles**

Add these styles at the end of the file:

```css
.templateSelector {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.templateSelect {
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--border-light);
  border-radius: 4px;
  font-size: 0.9375rem;
  background: var(--bg-primary);
  color: var(--text-primary);
  cursor: pointer;
}

.templateSelect:focus {
  outline: none;
  border-color: var(--primary-color, #00A79D);
  box-shadow: 0 0 0 2px rgba(0, 167, 157, 0.1);
}

.templateCard {
  padding: 1rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: 4px;
  font-size: 0.875rem;
}

.templateCardEmpty {
  color: var(--text-secondary);
  font-style: italic;
}

.templateCardTitle {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.templateCardMarca {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.templateCardMarca strong {
  color: var(--text-secondary);
  min-width: 6rem;
}

.templateCardSpecs {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border-light);
}

.templateCardSpecRow {
  display: flex;
  gap: 0.5rem;
}

.templateCardSpecRow strong {
  color: var(--text-secondary);
  min-width: 6rem;
}

.templateCardSpecRow span {
  color: var(--text-primary);
  word-break: break-word;
}

.templateLabel {
  display: block;
  font-weight: 500;
  margin-bottom: 0.375rem;
  color: var(--text-primary);
}
```

- [ ] **Step 3: Verify CSS variables exist in variables.css**

Run: `grep -E "(--primary-color|--bg-primary|--border-light|--text-primary)" frontend/src/styles/variables.css | head -5`

Expected: All variables should exist. If any are missing, they'll be inherited or use system defaults.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/EquipmentFormPage.module.css
git commit -m "style: add template reference card styles"
```

---

### Task 5: Integrate template selector into EquipmentFormPage

**Files:**
- Modify: `frontend/src/pages/EquipmentFormPage.tsx` — add template selector UI and logic

- [ ] **Step 1: Read the current EquipmentFormPage to understand structure**

Run: `head -n 80 frontend/src/pages/EquipmentFormPage.tsx`

This shows imports, state setup, and the form structure.

- [ ] **Step 2: Add templateId to form state**

Find the form state initialization (around line 25-44) and add:

```typescript
const [form, setForm] = useState({
  serie: '',
  modelo: '',
  templateId: '',  // ← ADD THIS LINE
  tipoEquipoId: '',
  ciudadId: '',
  seccionId: '',
  oficinaId: '',
  ip: '',
  mac: '',
  matricula: '',
  asignadoA: '',
  proveedor: '',
  fechaAdquisicion: '',
  nroInventario: '',
  garantiaHasta: '',
  fechaFinVida: '',
  precioCompra: '',
  observacion: '',
  motivo: '',
});
```

- [ ] **Step 3: Import useTemplates hook**

At the top of the file, update the imports from `useEquipment`:

```typescript
import { useEquipmentDetail, useEquipmentTypes, useNextSerie, useTemplates } from '../hooks/useEquipment';
```

- [ ] **Step 4: Add templateId to form pre-fill when editing**

Find the "Prellenar al editar" useEffect (around line 49-72) and add templateId:

```typescript
useEffect(() => {
  if (equipo && isEditing) {
    setForm({
      serie: String(equipo.serie),
      modelo: equipo.modelo || '',
      templateId: equipo.template?.id ? String(equipo.template.id) : '',  // ← ADD THIS
      tipoEquipoId: String(equipo.tipoEquipo.id),
      ciudadId: String(equipo.oficina.seccion.ciudad.id),
      seccionId: String(equipo.oficina.seccion.id),
      oficinaId: String(equipo.oficina.id),
      ip: equipo.ip || '',
      mac: equipo.mac || '',
      matricula: equipo.matricula || '',
      asignadoA: equipo.asignadoA || '',
      proveedor: equipo.proveedor || '',
      fechaAdquisicion: equipo.fechaAdquisicion ? equipo.fechaAdquisicion.slice(0, 10) : '',
      nroInventario: equipo.nroInventario || '',
      garantiaHasta: equipo.garantiaHasta ? equipo.garantiaHasta.slice(0, 10) : '',
      fechaFinVida: equipo.fechaFinVida ? equipo.fechaFinVida.slice(0, 10) : '',
      precioCompra: equipo.precioCompra ? String(equipo.precioCompra) : '',
      observacion: equipo.observacion || '',
      motivo: '',
    });
  }
}, [equipo, isEditing]);
```

- [ ] **Step 5: Call useTemplates hook with current tipoEquipoId**

Add this hook call after the other hook calls (around line 23):

```typescript
const { data: templates } = useTemplates(form.tipoEquipoId ? Number(form.tipoEquipoId) : undefined);
```

- [ ] **Step 6: Add templateId to form submission**

Find the payload construction in handleSubmit (around line 136-161) and add:

```typescript
const payload: Record<string, unknown> = {
  tipoEquipoId: Number(form.tipoEquipoId),
  oficinaId: Number(form.oficinaId),
  ...(form.templateId ? { templateId: Number(form.templateId) } : {}),  // ← ADD THIS
  modelo: form.modelo || undefined,
  // ... rest of payload
};
```

- [ ] **Step 7: Add template selector UI in the form**

Find the section "Datos del equipo" (around line 178-231) and add the template selector right after the Tipo field. Replace:

```typescript
            <div className={styles.field}>
              <label className={styles.label}>Tipo *</label>
              <select name="tipoEquipoId" value={form.tipoEquipoId} onChange={handleChange} className={styles.select} required>
                <option value="">Seleccioná un tipo...</option>
                {tipos?.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
```

With:

```typescript
            <div className={styles.field}>
              <label className={styles.label}>Tipo *</label>
              <select name="tipoEquipoId" value={form.tipoEquipoId} onChange={handleChange} className={styles.select} required>
                <option value="">Seleccioná un tipo...</option>
                {tipos?.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Plantilla (opcional)</label>
              <div className={styles.templateSelector}>
                <select 
                  name="templateId" 
                  value={form.templateId} 
                  onChange={handleChange} 
                  className={styles.templateSelect}
                >
                  <option value="">Sin plantilla</option>
                  {templates?.map((t) => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>

                {form.templateId && templates && (
                  (() => {
                    const selectedTemplate = templates.find(t => t.id === Number(form.templateId));
                    return selectedTemplate ? (
                      <div className={styles.templateCard}>
                        <div className={styles.templateCardTitle}>
                          {selectedTemplate.nombre}
                        </div>
                        {selectedTemplate.marca && (
                          <div className={styles.templateCardMarca}>
                            <strong>Marca:</strong>
                            <span>{selectedTemplate.marca}</span>
                          </div>
                        )}
                        {selectedTemplate.especificaciones && Object.keys(selectedTemplate.especificaciones).length > 0 && (
                          <div className={styles.templateCardSpecs}>
                            {Object.entries(selectedTemplate.especificaciones).map(([key, value]) => (
                              <div key={key} className={styles.templateCardSpecRow}>
                                <strong>{key}:</strong>
                                <span>{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null;
                  })()
                )}
              </div>
            </div>

            <div className={styles.field}>
```

- [ ] **Step 8: Run the dev server and test the form**

Run: `npm run dev`

Expected: The dev server starts (backend on :3001, frontend on :5173).

Navigate to `http://localhost:5173/equipos/nuevo` and verify:
- Tipo dropdown loads
- After selecting a tipo, "Plantilla (opcional)" dropdown populates with relevant templates
- Selecting a template shows a reference card with nombre, marca, especificaciones
- Form can still be submitted without a template selected
- When editing an equipment with a template, the dropdown pre-selects that template

- [ ] **Step 9: Commit**

```bash
git add frontend/src/pages/EquipmentFormPage.tsx frontend/src/pages/EquipmentFormPage.module.css
git commit -m "feat: add template selector and reference card to equipment form"
```

---

### Task 6: Add tests for templateId validation

**Files:**
- Modify: `backend/src/modules/equipment/equipment.service.test.ts`

- [ ] **Step 1: Read current equipment service tests**

Run: `cat backend/src/modules/equipment/equipment.service.test.ts | head -100`

This shows the test structure and mocking approach.

- [ ] **Step 2: Add test for createEquipment with valid templateId**

Add this test to the file (at the end of the describe block):

```typescript
it('should create equipment with valid templateId', async () => {
  const tipoId = 1;
  const templateId = 1;
  
  // Mock template that belongs to this tipo
  mockPrisma.modeloTemplate.findUnique.mockResolvedValueOnce({
    id: templateId,
    nombre: 'HP EliteDesk 800',
    tipoEquipoId: tipoId,
    marca: 'HP',
    especificaciones: {},
    createdAt: new Date(),
  } as any);

  mockPrisma.equipo.findUnique.mockResolvedValueOnce(null); // no existing serie
  
  mockPrisma.equipo.create.mockResolvedValueOnce({
    id: 1,
    serie: 9999,
    templateId: templateId,
    tipoEquipoId: tipoId,
    modelo: 'Test Model',
    // ... other fields with defaults
  } as any);

  const result = await equipmentService.createEquipment({
    serie: 9999,
    templateId: templateId,
    tipoEquipoId: tipoId,
    officinaId: 1,
  }, 1);

  expect(result.templateId).toBe(templateId);
  expect(mockPrisma.modeloTemplate.findUnique).toHaveBeenCalledWith({
    where: { id: templateId },
  });
});
```

- [ ] **Step 3: Add test for createEquipment with mismatched templateId**

Add this test:

```typescript
it('should reject templateId that does not match tipoEquipoId', async () => {
  const tipoId = 1;
  const templateId = 2;
  const wrongTipoId = 3;
  
  mockPrisma.modeloTemplate.findUnique.mockResolvedValueOnce({
    id: templateId,
    nombre: 'Dell OptiPlex',
    tipoEquipoId: wrongTipoId, // Different from requested tipoId
    marca: 'Dell',
    especificaciones: {},
    createdAt: new Date(),
  } as any);

  mockPrisma.equipo.findUnique.mockResolvedValueOnce(null);

  await expect(
    equipmentService.createEquipment({
      serie: 9999,
      templateId: templateId,
      tipoEquipoId: tipoId,
      officinaId: 1,
    }, 1)
  ).rejects.toThrow('La plantilla no corresponde al tipo de equipo seleccionado');
});
```

- [ ] **Step 4: Add test for updateEquipment with valid templateId**

Add this test:

```typescript
it('should update equipment with valid templateId', async () => {
  const equipoId = 1;
  const tipoId = 1;
  const templateId = 1;
  
  mockPrisma.equipo.findUnique
    .mockResolvedValueOnce({
      id: equipoId,
      tipoEquipoId: tipoId,
      templateId: null,
      // ... other fields
    } as any); // first call: get existing equipo
  
  mockPrisma.modeloTemplate.findUnique.mockResolvedValueOnce({
    id: templateId,
    nombre: 'HP EliteDesk 800',
    tipoEquipoId: tipoId,
    marca: 'HP',
    especificaciones: {},
    createdAt: new Date(),
  } as any);

  mockPrisma.equipo.update.mockResolvedValueOnce({
    id: equipoId,
    tipoEquipoId: tipoId,
    templateId: templateId,
    // ... other fields
  } as any);

  const result = await equipmentService.updateEquipment(equipoId, {
    templateId: templateId,
  }, 1);

  expect(result.templateId).toBe(templateId);
});
```

- [ ] **Step 5: Add test for updateEquipment clearing templateId (set to null)**

Add this test:

```typescript
it('should allow clearing templateId by setting it to null', async () => {
  const equipoId = 1;
  
  mockPrisma.equipo.findUnique.mockResolvedValueOnce({
    id: equipoId,
    tipoEquipoId: 1,
    templateId: 2,
    // ... other fields
  } as any);

  mockPrisma.equipo.update.mockResolvedValueOnce({
    id: equipoId,
    templateId: null,
    // ... other fields
  } as any);

  const result = await equipmentService.updateEquipment(equipoId, {
    templateId: null,
  }, 1);

  expect(result.templateId).toBeNull();
});
```

- [ ] **Step 6: Run the tests**

Run: `cd backend && npm test -- equipment.service.test.ts`

Expected: All tests pass, including new ones.

```
PASS  src/modules/equipment/equipment.service.test.ts
  EquipmentService
    ✓ should create equipment with valid templateId
    ✓ should reject templateId that does not match tipoEquipoId
    ✓ should update equipment with valid templateId
    ✓ should allow clearing templateId by setting it to null
    ... [other tests]
```

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/equipment/equipment.service.test.ts
git commit -m "test: add templateId validation tests for createEquipment and updateEquipment"
```

---

### Task 7: Verify end-to-end flow and fix any issues

**Files:**
- Check: Frontend form submission, backend validation, database persistence

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

Expected: Both backend (:3001) and frontend (:5173) start without errors.

- [ ] **Step 2: Log in and navigate to new equipment form**

Go to `http://localhost:5173/login` (if not logged in)
- Ficha: 9999
- Contraseña: admin123

Then navigate to `/equipos/nuevo`

- [ ] **Step 3: Test create equipment WITH template**

1. Select Tipo: "PC - Torre"
2. Select Plantilla: any available template
3. Verify the reference card displays below the selector
4. Fill in at least "N° de Serie" (or let it auto-fill)
5. Click "Crear equipo"
6. Verify the equipment is created and the template is saved

Expected: Equipment shows the template in the detail page.

- [ ] **Step 4: Test create equipment WITHOUT template**

1. Select Tipo: "Impresora"
2. Leave Plantilla as "Sin plantilla"
3. Fill in "N° de Serie"
4. Click "Crear equipo"
5. Verify the equipment is created with templateId = null

- [ ] **Step 5: Test edit equipment to add/change template**

1. Go to an existing equipment detail page
2. Click "Editar"
3. Change Plantilla dropdown
4. Verify reference card updates
5. Click "Guardar cambios"
6. Go back and verify the template changed

- [ ] **Step 6: Test validation error when template doesn't match tipo**

In browser DevTools console, try to submit:
```javascript
fetch('/api/v1/equipment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    serie: 99999,
    tipoEquipoId: 1,
    templateId: 999, // invalid ID
    oficinaId: 1,
  }),
});
```

Expected: 404 error "Plantilla no encontrada"

- [ ] **Step 7: Stop dev server and commit**

Run: `npm test` (backend tests)

Expected: All tests pass.

Then:
```bash
git add -A
git commit -m "feat: complete equipment-templates integration with e2e testing"
```

---

### Task 8: Create a design document (optional but recommended)

**Files:**
- Create: `docs/superpowers/specs/2026-04-14-equipment-templates-design.md`

- [ ] **Step 1: Write design spec document**

Create the file with:

```markdown
# Equipment Templates Design Spec

**Date:** 2026-04-14  
**Status:** Implemented

## Overview

Equipment templates are optional reusable configurations that can be assigned to equipment during creation or editing. Templates store modelo/marca/especificaciones data and are scoped to a specific equipment type.

## Requirements

1. **Optional Assignment** — Equipment does not require a template
2. **Type-Scoped** — Templates only available for matching equipment type
3. **Reference Data** — Template data displayed read-only, not copied to equipment
4. **Mutable Changes** — Changing/clearing template in edit mode without confirmation
5. **Deletion Protection** — Cannot delete template if equipos reference it

## Backend

- Validation: `templateId` must belong to same `tipoEquipoId`
- createEquipment: accepts optional templateId with validation
- updateEquipment: accepts optional templateId with validation (allows null)
- No auto-copying of template data to equipment

## Frontend

- useTemplates hook: fetch templates by tipoEquipoId
- EquipmentFormPage: dropdown selector + reference card component
- Reference card: read-only display of nombre, marca, especificaciones
- No auto-fill of form fields from template data

## Database

- Equipo.templateId: nullable FK to ModeloTemplate
- No data duplication — only the reference is stored

## Testing

- Validation: templateId type matching in create/update
- Mismatch error: reject templateId for different tipo
- Null handling: allow clearing templateId
- E2E: form submission with/without template
```

- [ ] **Step 2: Commit the design document**

```bash
git add docs/superpowers/specs/2026-04-14-equipment-templates-design.md
git commit -m "docs: add equipment-templates design specification"
```

---

## Summary

This plan implements complete equipment template integration:

1. ✅ Backend validation of templateId against tipoEquipoId
2. ✅ Frontend useTemplates hook for data fetching
3. ✅ Template selector dropdown in equipment form
4. ✅ Reference card component showing template data
5. ✅ Tests for template validation logic
6. ✅ E2E testing of create/edit/view flows
7. ✅ Maintains existing deletion protection

**All changes are isolated in the `feat/equipment-templates` branch.**

---
