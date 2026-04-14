# Equipment Templates Design Spec

**Date:** 2026-04-14  
**Status:** Implemented  
**Branch:** feat/equipment-templates

## Overview

Equipment templates are optional reusable configurations that can be assigned to equipment during creation or editing. Templates store modelo/marca/especificaciones data and are scoped to a specific equipment type.

When a user assigns a template to equipment, the template data is referenced (not copied). If the template is updated later, all equipment using that template will see the updated data.

## Requirements

1. **Optional Assignment** — Equipment does not require a template, templateId is nullable
2. **Type-Scoped** — Templates are filtered to show only templates matching the selected equipment type
3. **Reference Data** — Template data (marca, especificaciones) displayed read-only in UI, not auto-filled into form fields
4. **Mutable Changes** — Changing/clearing template in edit mode happens without confirmation
5. **Deletion Protection** — Cannot delete a template if equipment records reference it
6. **Backward Compatibility** — Existing equipment without templates continues to work unchanged

## Architecture

### Data Model

**ModeloTemplate** (in Prisma schema):
- `id` — Primary key
- `nombre` — Template name (e.g., "HP EliteDesk 800 G5")
- `tipoEquipoId` — Foreign key to TipoEquipo (scopes template to type)
- `marca` — Brand/manufacturer (optional, e.g., "HP")
- `especificaciones` — JSON object with key-value specs (optional, e.g., `{"RAM": "8GB", "Disk": "256GB SSD"}`)
- `createdAt` — Timestamp
- Relationship: `equipos[]` — Array of Equipo records using this template

**Equipo** (in Prisma schema):
- `templateId` — Foreign key to ModeloTemplate (optional, nullable)
- `template` — Relation to ModeloTemplate
- (All other equipment fields unchanged)

### Backend Validation

**createEquipment(data, userId):**
- If `data.templateId` is provided:
  - Queries `ModeloTemplate.findUnique({where: {id: templateId}})`
  - Returns 404 if not found: "Plantilla no encontrada"
  - Returns 400 if `template.tipoEquipoId !== data.tipoEquipoId`: "La plantilla no corresponde al tipo de equipo seleccionado"
- Proceeds with equipment creation, storing `templateId` in DB

**updateEquipment(id, data, userId):**
- Gets existing equipment to determine current `tipoEquipoId`
- If `data.templateId` is provided (including null):
  - If not null: validates template existence and tipo match (same logic as create)
  - If null: allows clearing the template (no validation needed)
- Updates equipment with new `templateId`

**deleteTemplate(id):**
- Existing validation: checks if any `Equipo.templateId` references this template
- If found: throws 400 error "No se puede eliminar: hay equipos usando esta plantilla"
- Prevents data inconsistency

### Frontend UI

**EquipmentFormPage component:**

1. **Tipo Selection** (existing)
   - User selects equipment type first
   - Triggers `useTemplates(tipoEquipoId)` to fetch templates for that type

2. **Template Selector** (new field)
   - Label: "Plantilla (opcional)"
   - Control: HTML `<select>` dropdown
   - Options: "Sin plantilla" (default) + filtered templates from `useTemplates` hook
   - Position: After "Tipo" field, before "Modelo" field

3. **Template Reference Card** (new conditional UI)
   - Appears only when `templateId` is selected and not empty
   - Displays read-only:
     - **Template Name** (bold heading)
     - **Marca** (if present): "Marca: HP"
     - **Especificaciones** (if present): Key-value list
   - Styling: Subtle background card with border separator
   - No editable fields — pure reference display

4. **Form Behavior**
   - When editing equipment with a template: dropdown pre-selects the current template
   - When changing template: reference card updates immediately
   - No confirmation dialog when changing/clearing template
   - Template data NOT auto-filled into modelo/marca/especificaciones fields
   - Form submission sends `templateId` in payload (omitted if empty)

### React Hooks

**useTemplates(tipoEquipoId?: number):**
- Fetches from `/api/v1/model-templates?tipoEquipoId=X`
- Returns array of Template objects
- Uses TanStack Query with:
  - `queryKey: ['templates', tipoEquipoId]` — separate cache per tipo
  - `staleTime: 30s` — consistent with other equipment hooks
- Handles undefined tipoEquipoId gracefully (fetches all templates)

### API Endpoints (no new endpoints required)

Existing endpoints handle template operations:

- **GET `/api/v1/model-templates`** — already filters by `?tipoEquipoId=X`
- **POST `/api/v1/equipment`** — already accepts optional `templateId`
- **PUT `/api/v1/equipment/:id`** — already accepts optional `templateId`
- **GET `/api/v1/equipment/:id`** — already includes template in response via Prisma include

### Error Handling

**Backend errors:**
- 404 "Plantilla no encontrada" — Template ID doesn't exist
- 400 "La plantilla no corresponde al tipo de equipo seleccionado" — Template belongs to different type
- 400 "No se puede eliminar: hay equipos usando esta plantilla" — Deletion blocked by existing references

**Frontend UI:**
- Dropdown only shows compatible templates (filtered by tipo)
- No validation errors shown to user for selection (validation happens on submit)
- API errors on submission are caught and displayed in error message

## Testing Strategy

### Unit Tests (backend/src/modules/equipment/equipment.service.test.ts)
1. ✅ Create equipment with valid templateId
2. ✅ Create equipment rejects mismatched templateId (400 error)
3. ✅ Create equipment rejects non-existent templateId (404 error)
4. ✅ Update equipment with valid templateId
5. ✅ Update equipment with tipo change + template validation
6. ✅ Update equipment allows clearing templateId (null)

### Integration Tests (manual, frontend)
1. ✅ Create equipment WITH template — verify form works, template saved
2. ✅ Create equipment WITHOUT template — verify optional assignment works
3. ✅ Edit equipment to add/change template — verify changes persist
4. ✅ API validation — verify 400/404 errors on invalid requests

## Database Schema Changes

No schema migrations required — the `Equipo.templateId` field already exists in the schema from initial design.

Prisma relations already configured:
```prisma
model Equipo {
  // ...
  templateId       Int?           @map("template_id")
  template         ModeloTemplate? @relation(fields: [templateId], references: [id])
  // ...
}

model ModeloTemplate {
  // ...
  equipos          Equipo[]
  // ...
}
```

## Backward Compatibility

- All existing equipment without templates (templateId = null) is unaffected
- Template selector is optional field (doesn't appear if no tipo selected)
- Equipment detail pages show template data inline if available
- No breaking changes to existing API responses

## Files Modified

**Backend:**
- `/backend/src/modules/equipment/equipment.service.ts` — added templateId validation logic
- `/backend/src/modules/equipment/equipment.service.test.ts` — added 6 unit tests

**Frontend:**
- `/frontend/src/hooks/useEquipment.ts` — added useTemplates hook
- `/frontend/src/pages/EquipmentFormPage.tsx` — integrated template selector + reference card
- `/frontend/src/pages/EquipmentFormPage.module.css` — added CSS classes for template UI

**Shared:**
- `/packages/shared/src/schemas/equipment.ts` — verified templateId already in schema

## Deployment Checklist

- [x] Backend validation logic implemented
- [x] Frontend UI components integrated
- [x] Unit tests passing (34 tests total)
- [x] Manual E2E testing completed
- [x] CSS styles implemented
- [x] Error messages in Spanish
- [x] React 19 patterns followed
- [x] TanStack Query configured properly
- [x] Backward compatible with existing data

## Future Enhancements (Out of Scope)

- [ ] Bulk assign templates to existing equipment
- [ ] Template versioning (track changes over time)
- [ ] Template preview/comparison UI
- [ ] Equipment clone with template preset
- [ ] Audit log for template reference changes
