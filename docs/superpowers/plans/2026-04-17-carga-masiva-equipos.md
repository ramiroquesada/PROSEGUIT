# Carga Masiva de Equipos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar un flujo de carga masiva de equipos accesible desde EquipmentListPage, que permita definir campos compartidos una vez y crear N equipos con numeración correlativa ajustable por fila.

**Architecture:** Nueva página `/equipos/lote` (`BulkEquipmentPage.tsx`) con sección de campos compartidos (reutiliza mismos componentes que `EquipmentFormPage`) y tabla de filas por equipo con serie editable. El envío dispara N `POST /equipment` secuenciales sin cambios en el backend. Si cualquier request falla, se aborta y se muestra el error en la fila correspondiente.

**Tech Stack:** React 19, TanStack Query, CSS Modules, Lucide React, hooks existentes (`useNextSerie`, `useEquipmentTypes`, `useTemplates`, `LocationCascadeSelect`)

---

## File Map

| Archivo | Acción | Responsabilidad |
|---------|--------|----------------|
| `frontend/src/App.tsx` | Modificar | Agregar lazy import y ruta `/equipos/lote` |
| `frontend/src/pages/EquipmentListPage.tsx` | Modificar | Agregar botón "+ Carga masiva" junto a "+ Nuevo equipo" |
| `frontend/src/pages/BulkEquipmentPage.tsx` | Crear | Página completa de carga masiva |
| `frontend/src/pages/BulkEquipmentPage.module.css` | Crear | Estilos de la página |

---

## Task 1: Registrar ruta y botón de entrada

**Files:**
- Modify: `frontend/src/App.tsx:9-17` (lazy imports) y `:58-61` (routes)
- Modify: `frontend/src/pages/EquipmentListPage.tsx:228-231` (botón área)

- [ ] **Step 1: Agregar lazy import y ruta en App.tsx**

En `frontend/src/App.tsx`, agregar el import lazy junto a los demás (después de la línea `const HistoryPage = lazy(...)`) y la ruta dentro del bloque de rutas protegidas:

```tsx
// Después de: const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const BulkEquipmentPage = lazy(() => import('./pages/BulkEquipmentPage'));
```

Y en las rutas (después de `<Route path="equipos/:id/editar" ...>`):

```tsx
<Route path="equipos/lote" element={<BulkEquipmentPage />} />
```

- [ ] **Step 2: Agregar botón "+ Carga masiva" en EquipmentListPage**

En `frontend/src/pages/EquipmentListPage.tsx`, reemplazar el bloque del botón actual (líneas 228-231):

```tsx
// ANTES:
<button className={styles.addBtn} onClick={() => navigate('/equipos/nuevo')}>
  <Plus size={16} />
  Nuevo Equipo
</button>

// DESPUÉS:
<div className={styles.addButtons}>
  <button className={styles.addBtn} onClick={() => navigate('/equipos/nuevo')}>
    <Plus size={16} />
    Nuevo Equipo
  </button>
  <button className={styles.bulkBtn} onClick={() => navigate('/equipos/lote')}>
    <Package size={16} />
    Carga masiva
  </button>
</div>
```

El ícono `Package` ya está importado en la línea 3 de `EquipmentListPage.tsx` — no requiere import nuevo.

- [ ] **Step 3: Agregar estilos `.addButtons` y `.bulkBtn` en EquipmentListPage.module.css**

Agregar después de la clase `.addBtn` (línea ~154):

```css
.addButtons {
  display: flex;
  gap: var(--space-sm);
  flex-shrink: 0;
}

.bulkBtn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-sm) var(--space-md);
  background: var(--color-secondary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-sm);
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.15s;
}

.bulkBtn:hover {
  opacity: 0.88;
}
```

En el bloque `@media (max-width: 640px)` al final del archivo, agregar:

```css
.addButtons { width: 100%; flex-direction: column; }
.bulkBtn { justify-content: center; }
```

- [ ] **Step 4: Verificar que la ruta y el botón funcionan**

Arrancar dev: `npm run dev` (si no está corriendo)

1. Ir a `/equipos` → verificar que aparecen dos botones: "Nuevo Equipo" y "Carga masiva"
2. Hacer click en "Carga masiva" → debe navegar a `/equipos/lote` (puede mostrar error de página vacía — eso es esperado, la página no existe todavía)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.tsx frontend/src/pages/EquipmentListPage.tsx frontend/src/pages/EquipmentListPage.module.css
git commit -m "feat: add bulk equipment route and entry button"
```

---

## Task 2: Crear BulkEquipmentPage — estructura y campos compartidos

**Files:**
- Create: `frontend/src/pages/BulkEquipmentPage.tsx`
- Create: `frontend/src/pages/BulkEquipmentPage.module.css`

- [ ] **Step 1: Crear el CSS**

Crear `frontend/src/pages/BulkEquipmentPage.module.css`:

```css
.page {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.backBtn {
  background: none;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
  font-size: var(--font-sm);
  padding: 0;
}

.title {
  font-size: var(--font-xl);
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.section {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  box-shadow: var(--shadow-sm);
}

.sectionTitle {
  font-size: var(--font-md);
  font-weight: 600;
  color: var(--color-secondary);
  margin: 0 0 var(--space-sm);
  padding-bottom: var(--space-sm);
  border-bottom: 1px solid var(--color-border);
}

.grid3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: var(--space-md);
}

.grid4 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: var(--space-md);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.label {
  font-size: var(--font-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
}

.input,
.select,
.textarea {
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-sm);
  color: var(--color-text);
  background: var(--color-background);
  transition: border-color 0.15s;
}

.input:focus,
.select:focus,
.textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

.textarea {
  resize: vertical;
  min-height: 80px;
}

/* ─── Template card ─── */
.templateCard {
  background: var(--color-background);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-md);
  padding: var(--space-sm) var(--space-md);
  font-size: var(--font-sm);
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: var(--space-xs);
}

.templateCardTitle {
  font-weight: 600;
  color: var(--color-primary);
}

.templateCardRow {
  display: flex;
  gap: var(--space-sm);
  color: var(--color-text-secondary);
}

/* ─── Generator ─── */
.generatorRow {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.generatorLabel {
  font-size: var(--font-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
}

.qtyInput {
  width: 72px;
  text-align: center;
  padding: var(--space-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-sm);
}

.generateBtn {
  padding: var(--space-sm) var(--space-md);
  background: var(--color-secondary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-sm);
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s;
}

.generateBtn:hover {
  opacity: 0.88;
}

.serieHint {
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
}

/* ─── Rows table ─── */
.tableWrapper {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th {
  background: var(--color-secondary);
  color: white;
  font-size: var(--font-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: var(--space-sm) var(--space-md);
  text-align: left;
  white-space: nowrap;
}

.table td {
  padding: var(--space-xs) var(--space-sm);
  border-bottom: 1px solid var(--color-border);
  vertical-align: middle;
}

.table tr:last-child td {
  border-bottom: none;
}

.rowNum {
  font-size: var(--font-xs);
  color: var(--color-text-secondary);
  text-align: center;
  width: 36px;
}

.rowInput {
  width: 100%;
  padding: 5px 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-sm);
  color: var(--color-text);
  background: var(--color-background);
}

.rowInput:focus {
  outline: none;
  border-color: var(--color-primary);
}

.rowInput.hasError {
  border-color: var(--color-danger, #dc3545);
  background: #fff5f5;
}

.rowError {
  font-size: var(--font-xs);
  color: var(--color-danger, #dc3545);
  padding: 0 var(--space-sm) var(--space-xs);
}

.removeBtn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s;
}

.removeBtn:hover {
  color: var(--color-danger, #dc3545);
}

/* ─── Footer actions ─── */
.actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-md);
  align-items: center;
}

.error {
  background: #fee;
  border: 1px solid #fcc;
  border-radius: var(--radius-md);
  padding: var(--space-sm) var(--space-md);
  color: var(--color-danger, #dc3545);
  font-size: var(--font-sm);
}

.cancelBtn {
  padding: var(--space-sm) var(--space-lg);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-sm);
  cursor: pointer;
  color: var(--color-text);
  transition: background 0.15s;
}

.cancelBtn:hover {
  background: var(--color-border);
}

.submitBtn {
  padding: var(--space-sm) var(--space-lg);
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-sm);
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s;
}

.submitBtn:hover:not(:disabled) {
  opacity: 0.88;
}

.submitBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .grid3, .grid4 { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 480px) {
  .grid3, .grid4 { grid-template-columns: 1fr; }
}
```

- [ ] **Step 2: Crear BulkEquipmentPage.tsx — imports y tipos**

Crear `frontend/src/pages/BulkEquipmentPage.tsx`:

```tsx
import { useState, useEffect, useId } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useEquipmentTypes, useNextSerie, useTemplates } from '../hooks/useEquipment';
import { useLocationTree } from '../hooks/useLocations';
import { api } from '../lib/api-client';
import { findSoporteOffice } from '../lib/find-soporte-office';
import LocationCascadeSelect from '../components/LocationCascadeSelect';
import { usePageTitle } from '../hooks/usePageTitle';
import styles from './BulkEquipmentPage.module.css';

interface SharedFields {
  tipoEquipoId: string;
  templateId: string;
  modelo: string;
  ciudadId: string;
  seccionId: string;
  oficinaId: string;
  proveedor: string;
  fechaAdquisicion: string;
  garantiaHasta: string;
  fechaFinVida: string;
  precioCompra: string;
  observacion: string;
}

interface EquipmentRow {
  id: string;
  serie: string;
  matricula: string;
  mac: string;
  ip: string;
  error: string;
}
```

- [ ] **Step 3: Agregar el componente principal con estado y efectos**

Continuar `BulkEquipmentPage.tsx` — agregar el componente:

```tsx
export default function BulkEquipmentPage() {
  usePageTitle('Carga masiva de equipos');
  const navigate = useNavigate();
  const qc = useQueryClient();
  const uid = useId();

  const { data: tipos } = useEquipmentTypes();
  const { data: nextSerieData } = useNextSerie();
  const { data: locations } = useLocationTree();

  const [shared, setShared] = useState<SharedFields>({
    tipoEquipoId: '',
    templateId: '',
    modelo: '',
    ciudadId: '',
    seccionId: '',
    oficinaId: '',
    proveedor: '',
    fechaAdquisicion: '',
    garantiaHasta: '',
    fechaFinVida: '',
    precioCompra: '',
    observacion: '',
  });

  const [qty, setQty] = useState(1);
  const [rows, setRows] = useState<EquipmentRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const { data: templates } = useTemplates(
    shared.tipoEquipoId ? Number(shared.tipoEquipoId) : undefined
  );

  // Pre-seleccionar oficina soporte al cargar ubicaciones
  useEffect(() => {
    if (!locations) return;
    const soporte = findSoporteOffice(locations);
    if (soporte) {
      setShared((p) => ({
        ...p,
        ciudadId: String(soporte.ciudadId),
        seccionId: String(soporte.seccionId),
        oficinaId: String(soporte.oficinaId),
      }));
    }
  }, [locations]);

  // Limpiar templateId si cambia el tipo
  useEffect(() => {
    setShared((p) => ({ ...p, templateId: '' }));
  }, [shared.tipoEquipoId]);

  const nextSerie = nextSerieData?.nextSerie ?? 1;

  function handleSharedChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setShared((p) => ({ ...p, [name]: value }));
    setSubmitError('');
  }

  function generateRows() {
    const n = Math.max(1, Math.min(qty, 200));
    const newRows: EquipmentRow[] = Array.from({ length: n }, (_, i) => ({
      id: `${uid}-${i}-${Date.now()}`,
      serie: String(nextSerie + i),
      matricula: '',
      mac: '',
      ip: '',
      error: '',
    }));
    setRows(newRows);
    setSubmitError('');
  }

  function updateRow(id: string, field: keyof Omit<EquipmentRow, 'id' | 'error'>, value: string) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value, error: '' } : r))
    );
    setSubmitError('');
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  // Detectar series duplicadas dentro del lote
  function getDuplicateSeries(): Set<string> {
    const seen = new Set<string>();
    const dupes = new Set<string>();
    for (const row of rows) {
      const s = row.serie.trim();
      if (s && seen.has(s)) dupes.add(s);
      seen.add(s);
    }
    return dupes;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!shared.tipoEquipoId || !shared.oficinaId) {
      setSubmitError('Tipo de equipo y ubicación son obligatorios');
      return;
    }
    if (rows.length === 0) {
      setSubmitError('Generá al menos una fila de equipos');
      return;
    }

    // Validación client-side: series vacías o duplicadas dentro del lote
    const dupes = getDuplicateSeries();
    let hasClientError = false;
    const checkedRows = rows.map((r) => {
      if (!r.serie.trim() || isNaN(Number(r.serie))) {
        hasClientError = true;
        return { ...r, error: 'Serie requerida y debe ser un número' };
      }
      if (dupes.has(r.serie.trim())) {
        hasClientError = true;
        return { ...r, error: 'Serie duplicada en el lote' };
      }
      return r;
    });

    if (hasClientError) {
      setRows(checkedRows);
      setSubmitError('Corregí los errores en las filas antes de continuar');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    const sharedPayload: Record<string, unknown> = {
      tipoEquipoId: Number(shared.tipoEquipoId),
      oficinaId: Number(shared.oficinaId),
      modelo: shared.modelo || undefined,
      proveedor: shared.proveedor || undefined,
      fechaAdquisicion: shared.fechaAdquisicion || null,
      garantiaHasta: shared.garantiaHasta || null,
      fechaFinVida: shared.fechaFinVida || null,
      precioCompra: shared.precioCompra ? Number(shared.precioCompra) : null,
      observacion: shared.observacion || undefined,
      ...(shared.templateId ? { templateId: Number(shared.templateId) } : {}),
    };

    for (const row of rows) {
      const payload = {
        ...sharedPayload,
        serie: Number(row.serie),
        matricula: row.matricula || undefined,
        mac: row.mac || undefined,
        ip: row.ip || undefined,
      };

      try {
        await api.post('/equipment', payload);
      } catch (err: any) {
        const msg = err?.message || 'Error al crear el equipo';
        setRows((prev) =>
          prev.map((r) => (r.id === row.id ? { ...r, error: msg } : r))
        );
        setSubmitError(`Error en serie ${row.serie}: ${msg}. No se creó ningún equipo.`);
        setIsSubmitting(false);
        return;
      }
    }

    qc.invalidateQueries({ queryKey: ['equipment'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    navigate('/equipos');
  }

  const selectedTemplate = templates?.find((t) => t.id === Number(shared.templateId));
  const duplicateSeries = getDuplicateSeries();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/equipos')}>
          ← Volver
        </button>
        <h2 className={styles.title}>Carga masiva de equipos</h2>
      </div>

      <form onSubmit={handleSubmit}>
        {/* ── Datos compartidos ── */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Datos compartidos (todos los equipos)</h3>

          <div className={styles.grid3}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="tipoEquipoId">Tipo *</label>
              <select
                id="tipoEquipoId"
                name="tipoEquipoId"
                value={shared.tipoEquipoId}
                onChange={handleSharedChange}
                className={styles.select}
                required
              >
                <option value="">Seleccioná un tipo...</option>
                {tipos?.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="templateId">Plantilla (opcional)</label>
              <select
                id="templateId"
                name="templateId"
                value={shared.templateId}
                onChange={handleSharedChange}
                className={styles.select}
              >
                <option value="">Sin plantilla</option>
                {templates?.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="modelo">Modelo</label>
              <input
                id="modelo"
                type="text"
                name="modelo"
                value={shared.modelo}
                onChange={handleSharedChange}
                className={styles.input}
                placeholder="Ej: TP-Link TL-ER7206"
              />
            </div>
          </div>

          {selectedTemplate && (
            <div className={styles.templateCard}>
              <div className={styles.templateCardTitle}>{selectedTemplate.nombre}</div>
              {selectedTemplate.marca && (
                <div className={styles.templateCardRow}>
                  <strong>Marca:</strong> <span>{selectedTemplate.marca}</span>
                </div>
              )}
              {selectedTemplate.especificaciones &&
                Object.entries(selectedTemplate.especificaciones).map(([k, v]) => (
                  <div key={k} className={styles.templateCardRow}>
                    <strong>{k}:</strong> <span>{String(v)}</span>
                  </div>
                ))}
            </div>
          )}

          <div>
            <label className={styles.label}>Ubicación *</label>
            <LocationCascadeSelect
              required
              value={{
                ciudadId: shared.ciudadId,
                seccionId: shared.seccionId,
                oficinaId: shared.oficinaId,
              }}
              onChange={(v) => setShared((p) => ({ ...p, ...v }))}
              onError={(msg) => setSubmitError(msg)}
            />
          </div>

          <div className={styles.grid4}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="proveedor">Proveedor</label>
              <input
                id="proveedor"
                type="text"
                name="proveedor"
                value={shared.proveedor}
                onChange={handleSharedChange}
                className={styles.input}
                placeholder="Ej: TechShop SRL"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="fechaAdquisicion">Fecha adquisición</label>
              <input
                id="fechaAdquisicion"
                type="date"
                name="fechaAdquisicion"
                value={shared.fechaAdquisicion}
                onChange={handleSharedChange}
                className={styles.input}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="garantiaHasta">Garantía hasta</label>
              <input
                id="garantiaHasta"
                type="date"
                name="garantiaHasta"
                value={shared.garantiaHasta}
                onChange={handleSharedChange}
                className={styles.input}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="fechaFinVida">Fin de vida</label>
              <input
                id="fechaFinVida"
                type="date"
                name="fechaFinVida"
                value={shared.fechaFinVida}
                onChange={handleSharedChange}
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.grid3}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="precioCompra">Precio de compra</label>
              <input
                id="precioCompra"
                type="number"
                name="precioCompra"
                value={shared.precioCompra}
                onChange={handleSharedChange}
                className={styles.input}
                placeholder="Ej: 25000"
                step="0.01"
                min="0"
              />
            </div>
            <div className={`${styles.field} ${styles.spanFull}`} style={{ gridColumn: 'span 2' }}>
              <label className={styles.label} htmlFor="observacion">Observaciones</label>
              <textarea
                id="observacion"
                name="observacion"
                value={shared.observacion}
                onChange={handleSharedChange}
                className={styles.textarea}
                placeholder="Observaciones comunes a todos los equipos..."
              />
            </div>
          </div>
        </div>

        {/* ── Generador + tabla de equipos ── */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Equipos a crear</h3>

          <div className={styles.generatorRow}>
            <span className={styles.generatorLabel}>Cantidad:</span>
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(Math.max(1, Math.min(200, Number(e.target.value))))}
              className={styles.qtyInput}
              min={1}
              max={200}
            />
            <button type="button" className={styles.generateBtn} onClick={generateRows}>
              Generar filas
            </button>
            {rows.length === 0 && nextSerieData && (
              <span className={styles.serieHint}>
                → Series desde <strong>{nextSerie}</strong>
              </span>
            )}
            {rows.length > 0 && (
              <span className={styles.serieHint}>
                {rows.length} fila{rows.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {rows.length > 0 && (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>#</th>
                    <th style={{ width: 110 }}>Serie *</th>
                    <th>Matrícula</th>
                    <th>MAC</th>
                    <th>IP</th>
                    <th style={{ width: 36 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const isDupe = duplicateSeries.has(row.serie.trim()) && row.serie.trim() !== '';
                    const hasErr = Boolean(row.error) || isDupe;
                    return (
                      <>
                        <tr key={row.id}>
                          <td className={styles.rowNum}>{idx + 1}</td>
                          <td>
                            <input
                              type="number"
                              value={row.serie}
                              onChange={(e) => updateRow(row.id, 'serie', e.target.value)}
                              className={`${styles.rowInput} ${hasErr ? styles.hasError : ''}`}
                              min={1}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={row.matricula}
                              onChange={(e) => updateRow(row.id, 'matricula', e.target.value)}
                              className={styles.rowInput}
                              placeholder="opcional"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={row.mac}
                              onChange={(e) => updateRow(row.id, 'mac', e.target.value)}
                              className={styles.rowInput}
                              placeholder="opcional"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={row.ip}
                              onChange={(e) => updateRow(row.id, 'ip', e.target.value)}
                              className={styles.rowInput}
                              placeholder="opcional"
                            />
                          </td>
                          <td>
                            <button
                              type="button"
                              className={styles.removeBtn}
                              onClick={() => removeRow(row.id)}
                              title="Eliminar fila"
                            >
                              <X size={14} />
                            </button>
                          </td>
                        </tr>
                        {(row.error || isDupe) && (
                          <tr key={`${row.id}-err`}>
                            <td />
                            <td colSpan={5} className={styles.rowError}>
                              {row.error || 'Serie duplicada en el lote'}
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {submitError && <div className={styles.error}>{submitError}</div>}

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={() => navigate('/equipos')}>
            Cancelar
          </button>
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isSubmitting || rows.length === 0}
          >
            {isSubmitting
              ? 'Creando equipos...'
              : `Crear ${rows.length} equipo${rows.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Verificar que TypeScript compila sin errores**

```bash
cd frontend && npx tsc --noEmit
```

Esperado: sin errores. Si hay errores de tipo, corregirlos antes de continuar.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/BulkEquipmentPage.tsx frontend/src/pages/BulkEquipmentPage.module.css
git commit -m "feat: add BulkEquipmentPage with shared fields and per-row table"
```

---

## Task 3: Prueba manual del flujo completo

- [ ] **Step 1: Arrancar el entorno de desarrollo**

```bash
npm run db:up   # solo si Docker no está corriendo
npm run dev
```

- [ ] **Step 2: Verificar flujo happy path**

1. Ir a `http://localhost:5173/equipos`
2. Verificar botones "Nuevo Equipo" y "Carga masiva" en la toolbar
3. Click en "Carga masiva" → navega a `/equipos/lote`
4. Seleccionar tipo de equipo (ej: "Router")
5. Verificar que la ubicación pre-selecciona "Soporte" automáticamente
6. Ingresar cantidad 3 → click "Generar filas"
7. Verificar que se generan 3 filas con series `nextSerie`, `nextSerie+1`, `nextSerie+2`
8. Editar manualmente la serie de la fila 2 a un valor distinto → verificar que se respeta
9. Eliminar fila 3 con ✕ → verificar que queda solo 2 filas
10. Click "Crear 2 equipos" → verificar que redirige a `/equipos` y los equipos aparecen en el listado

- [ ] **Step 3: Verificar manejo de errores — serie duplicada en el lote**

1. Generar 3 filas
2. Cambiar la serie de la fila 2 para que sea igual a la fila 1
3. Click "Crear 3 equipos" → debe mostrar error en fila 2 "Serie duplicada en el lote" sin llamar al backend

- [ ] **Step 4: Verificar manejo de errores — serie ya existe en DB**

1. Generar 1 fila con una serie que ya existe en la base de datos
2. Click "Crear 1 equipo" → debe mostrar el error del backend en la fila y el mensaje "No se creó ningún equipo."

- [ ] **Step 5: Verificar invalidación de caché**

Después de una carga exitosa:
1. El listado en `/equipos` debe mostrar los equipos recién creados sin recargar la página manualmente
2. El dashboard en `/` debe reflejar el nuevo conteo de equipos

- [ ] **Step 6: Commit final**

```bash
git add .
git commit -m "feat: bulk equipment creation complete"
```
