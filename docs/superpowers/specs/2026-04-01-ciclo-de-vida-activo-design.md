# Ciclo de vida del activo — Spec

**Fecha:** 2026-04-01
**Estado:** Aprobado

---

## Resumen

Agregar campos de ciclo de vida al modelo `Equipo`: fecha de compra, fecha de fin de garantía, fecha estimada de fin de vida y precio de compra. Todos opcionales. Visibles y editables en la ficha y el formulario del equipo. Badge visual en la ficha cuando la garantía está por vencer o ya venció.

---

## Modelo de datos

Cuatro campos nuevos en `Equipo`, todos opcionales:

```prisma
model Equipo {
  // campos existentes...
  fechaCompra       DateTime?  @map("fecha_compra")
  fechaFinGarantia  DateTime?  @map("fecha_fin_garantia")
  fechaFinVida      DateTime?  @map("fecha_fin_vida")
  precioCompra      Decimal?   @map("precio_compra") @db.Decimal(10, 2)
}
```

Una migración Prisma estándar. Los equipos existentes quedan con `null` en estos campos — sin impacto en datos actuales.

---

## Backend

**Módulo afectado:** `backend/src/modules/equipment/`

- **`equipment.service.ts`** — `createEquipment` y `updateEquipment` reciben y persisten los 4 campos opcionales. `listEquipment` y `getEquipmentById` no requieren cambio (ya retornan todos los campos del modelo).
- **`packages/shared/src/schemas/`** — agregar al schema Zod de equipo:
  - `fechaCompra`: `z.string().date().optional()`
  - `fechaFinGarantia`: `z.string().date().optional()`
  - `fechaFinVida`: `z.string().date().optional()`
  - `precioCompra`: `z.number().positive().optional()`
- **`equipment.controller.ts`** — sin cambios.
- **Rutas** — sin cambios.

---

## Frontend

### EquipmentFormPage (crear / editar)

Nueva sección **"Ciclo de vida"** al final del formulario, con 4 campos opcionales:

| Campo | Input | Validación |
|-------|-------|-----------|
| Fecha de compra | `<input type="date">` | opcional |
| Fecha fin de garantía | `<input type="date">` | opcional |
| Fecha fin de vida estimada | `<input type="date">` | opcional |
| Precio de compra | `<input type="number">` | opcional, positivo |

Al editar, los campos se pre-rellenan con los valores existentes.

### EquipmentDetailPage (ficha)

Nueva sección **"Ciclo de vida"** mostrando los 4 campos. Para `fechaFinGarantia`:

| Condición | Badge |
|-----------|-------|
| `fechaFinGarantia` < hoy | Rojo — "Garantía vencida" |
| `fechaFinGarantia` ≤ hoy + 30 días | Amarillo — "Vence en N días" |
| `fechaFinGarantia` > hoy + 30 días | Sin badge, solo la fecha formateada |
| Sin fecha | No se muestra nada |

La lógica del badge se implementa en un helper `getWarrantyStatus(fechaFinGarantia: Date | null)` dentro de `frontend/src/lib/equipment-status.ts`, reutilizable para el futuro módulo de alertas globales.

---

## Lo que NO incluye este spec

- Alertas globales (in-app o email) — feature separado de medio plazo
- Filtros por fecha en el listado de equipos — no requerido en esta iteración
- Depreciación ni cálculo de costos — feature separado de medio plazo
