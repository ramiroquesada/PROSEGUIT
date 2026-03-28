# Equipment Detail — Rediseño Visual

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar visualmente `EquipmentDetailPage` con hero institucional navy+teal, fila bento de 4 métricas y columna fluida (detalles → acciones → timeline), sin tocar lógica de negocio.

**Architecture:** Solo CSS + estructura JSX. La lógica (mutations, resolveEstado, modal de acción) no cambia. El layout pasa de 2 columnas (izquierda+derecha) a columna única con hero en el tope y bento row como puente entre hero y body.

**Tech Stack:** React 19, CSS Modules con nesting nativo, custom properties de `variables.css`, Lucide React.

---

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `frontend/src/pages/EquipmentDetailPage.module.css` | Reescritura completa |
| `frontend/src/pages/EquipmentDetailPage.tsx` | Estructura JSX: hero, bento row, layout columna única, acciones con descripción |

---

### Task 1: Hero — CSS

**Files:**
- Modify: `frontend/src/pages/EquipmentDetailPage.module.css`

- [ ] **Step 1: Reemplazar todo el contenido del CSS con la base del hero**

Reemplazar el archivo completo con este contenido inicial (solo incluye `.page`, `.loading`, `.notFound` y el bloque del hero — el resto se agrega en tasks siguientes):

```css
/* ── Base ─────────────────────────────────────────────────────────────────── */
.page {
  max-width: 1200px;
  padding-bottom: var(--space-2xl);
  display: flex;
  flex-direction: column;
}

.loading,
.notFound {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  padding: var(--space-2xl);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  text-align: center;
  min-height: 40vh;
}

.notFound button {
  margin-top: var(--space-sm);
}

/* ── Hero ─────────────────────────────────────────────────────────────────── */
.hero {
  background: linear-gradient(135deg, #002244 0%, #003366 45%, #004455 75%, #005550 100%);
  padding: var(--space-xl);
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;

  &::before {
    content: '';
    position: absolute;
    top: -40px;
    right: -40px;
    width: 200px;
    height: 200px;
    border-radius: var(--radius-full);
    background: rgba(0, 167, 157, 0.12);
    pointer-events: none;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: -50px;
    left: 10%;
    width: 140px;
    height: 140px;
    border-radius: var(--radius-full);
    background: rgba(255, 255, 255, 0.03);
    pointer-events: none;
  }
}

.heroNav {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-lg);
  position: relative;
}

.backBtn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-sm);
  color: rgba(255, 255, 255, 0.55);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  border-radius: var(--radius-md);
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.06);
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);

  &:hover {
    background: rgba(255, 255, 255, 0.12);
    color: rgba(255, 255, 255, 0.85);
  }
}

.heroBody {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-lg);
  position: relative;
  flex-wrap: wrap;
}

.heroIdentity {
  display: flex;
  gap: var(--space-md);
  align-items: flex-start;
}

.heroIcon {
  width: 52px;
  height: 52px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.7);
}

.heroTitle {
  color: #fff;
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-black);
  letter-spacing: -0.03em;
  line-height: 1;
}

.heroSubtitle {
  color: rgba(255, 255, 255, 0.55);
  font-size: var(--font-size-sm);
  margin-top: var(--space-xs);
}

.heroLocation {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  margin-top: var(--space-sm);
  color: rgba(255, 255, 255, 0.4);
  font-size: var(--font-size-xs);
}

.heroLocationDot {
  width: 8px;
  height: 8px;
  background: rgba(0, 167, 157, 0.7);
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.heroRight {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-sm);
}

.heroBadge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  letter-spacing: 0.3px;
  border: 1px solid transparent;

  &::before {
    content: '';
    width: 7px;
    height: 7px;
    border-radius: var(--radius-full);
    flex-shrink: 0;
  }

  &[data-color="success"] {
    background: rgba(5, 150, 105, 0.2);
    color: #6ee7b7;
    border-color: rgba(5, 150, 105, 0.35);
    &::before { background: #34d399; box-shadow: 0 0 6px #34d399; }
  }
  &[data-color="warning"] {
    background: rgba(217, 119, 6, 0.2);
    color: #fcd34d;
    border-color: rgba(217, 119, 6, 0.35);
    &::before { background: #fbbf24; }
  }
  &[data-color="danger"] {
    background: rgba(220, 38, 38, 0.2);
    color: #fca5a5;
    border-color: rgba(220, 38, 38, 0.35);
    &::before { background: #f87171; }
  }
  &[data-color="info"] {
    background: rgba(37, 99, 235, 0.2);
    color: #93c5fd;
    border-color: rgba(37, 99, 235, 0.35);
    &::before { background: #60a5fa; }
  }
  &[data-color="neutral"] {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.6);
    border-color: rgba(255, 255, 255, 0.2);
    &::before { background: rgba(255, 255, 255, 0.5); }
  }
  &[data-color="new"] {
    background: rgba(67, 97, 176, 0.25);
    color: #a5b4fc;
    border-color: rgba(67, 97, 176, 0.4);
    &::before { background: #818cf8; }
  }
}

.editBtn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-sm) var(--space-md);
  background: var(--color-primary);
  color: white;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.35);
  transition: background var(--transition-fast), box-shadow var(--transition-fast);

  &:hover {
    background: var(--color-primary-dark);
    box-shadow: 0 6px 16px rgba(var(--color-primary-rgb), 0.45);
  }
}
```

- [ ] **Step 2: Verificar visualmente**

Correr el frontend (`npm run dev`) y abrir `/equipos/:id`. El hero debe mostrarse con fondo negro/azul oscuro. El layout puede verse roto en el body — es esperado en este punto.

---

### Task 2: Bento Row — CSS + JSX

**Files:**
- Modify: `frontend/src/pages/EquipmentDetailPage.module.css` (agregar al final)
- Modify: `frontend/src/pages/EquipmentDetailPage.tsx`

- [ ] **Step 1: Agregar CSS del bento row al final del módulo**

```css
/* ── Bento Row ─────────────────────────────────────────────────────────────── */
.bentoRow {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border: 1px solid var(--color-border);
  border-top: none;
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);

  @media (width < 700px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.bentoCell {
  background: var(--color-surface);
  padding: var(--space-md) var(--space-lg);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 3px;

  &:last-child { border-right: none; }

  @media (width < 700px) {
    &:nth-child(2) { border-right: none; }
    &:nth-child(3) { border-right: 1px solid var(--color-border); }
    border-bottom: 1px solid var(--color-border);
  }
}

.bentoCell.bentoCellHighlight {
  background: var(--color-primary-subtle);
}

.bentoCellLabel {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.bentoCellValue {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  color: var(--color-secondary);
}

.bentoCellSub {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}
```

- [ ] **Step 2: Agregar bloque `bentoRow` en el JSX**

En `EquipmentDetailPage.tsx`, localizar el bloque del hero (que crearemos en Task 3) y agregar el bento row inmediatamente después, dentro del `<div className={styles.page}>` pero antes de `.content`.

Primero, agregar estas variables de cálculo justo antes del `return`:

```tsx
// Datos para el bento row
const lastAction = historial && historial.length > 0
  ? [...historial].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0]
  : null;

const totalHistorial = historial?.length ?? 0;
const totalPrestamos = historial?.filter(h => h.accion === 'PRESTAMO').length ?? 0;
const prestamosActivos = totalPrestamos - (historial?.filter(h => h.accion === 'DEVOLUCION').length ?? 0);
```

Luego, en el JSX (después del bloque del hero), insertar:

```tsx
{/* ── Bento Row ─────────────────────────────────────────────────── */}
<div className={styles.bentoRow}>
  <div className={`${styles.bentoCell} ${styles.bentoCellHighlight}`}>
    <span className={styles.bentoCellLabel}>📍 Ubicación actual</span>
    <span className={styles.bentoCellValue}>{equipo.oficina.nombre}</span>
    <span className={styles.bentoCellSub}>
      {equipo.oficina.seccion.nombre} · {equipo.oficina.seccion.ciudad.nombre}
    </span>
  </div>
  <div className={styles.bentoCell}>
    <span className={styles.bentoCellLabel}>📋 Última acción</span>
    <span className={styles.bentoCellValue} style={{ color: lastAction ? `var(--color-${ACCION_COLOR[lastAction.accion] === 'primary' ? 'primary' : ACCION_COLOR[lastAction.accion] === 'neutral' ? 'text-secondary' : ACCION_COLOR[lastAction.accion]})` : undefined }}>
      {lastAction ? (ACCION_LABEL[lastAction.accion] || lastAction.accion) : '—'}
    </span>
    <span className={styles.bentoCellSub}>
      {lastAction ? new Date(lastAction.fecha).toLocaleDateString('es-UY') : 'Sin registros'}
    </span>
  </div>
  <div className={styles.bentoCell}>
    <span className={styles.bentoCellLabel}>🔄 Préstamos</span>
    <span className={styles.bentoCellValue} style={{ color: prestamosActivos > 0 ? 'var(--color-info)' : 'var(--color-text-tertiary)' }}>
      {prestamosActivos} activo{prestamosActivos !== 1 ? 's' : ''}
    </span>
    <span className={styles.bentoCellSub}>{totalPrestamos} histórico{totalPrestamos !== 1 ? 's' : ''}</span>
  </div>
  <div className={styles.bentoCell}>
    <span className={styles.bentoCellLabel}>🛠 Historial</span>
    <span className={styles.bentoCellValue}>{totalHistorial} acción{totalHistorial !== 1 ? 'es' : ''}</span>
    <span className={styles.bentoCellSub}>
      {historial && historial.length > 0
        ? `desde ${new Date([...historial].sort((a,b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())[0].fecha).getFullYear()}`
        : 'Sin registros'}
    </span>
  </div>
</div>
```

- [ ] **Step 3: Verificar visualmente**

La fila bento debe aparecer debajo del hero como una barra blanca con 4 celdas. En mobile (< 700px) debe colapsar a 2×2.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/EquipmentDetailPage.module.css frontend/src/pages/EquipmentDetailPage.tsx
git commit -m "feat: hero + bento row en ficha de equipo"
```

---

### Task 3: Layout columna única — CSS + JSX

**Files:**
- Modify: `frontend/src/pages/EquipmentDetailPage.module.css` (agregar al final)
- Modify: `frontend/src/pages/EquipmentDetailPage.tsx`

- [ ] **Step 1: Agregar CSS de body y cards al final del módulo**

```css
/* ── Body ─────────────────────────────────────────────────────────────────── */
.pageBody {
  padding: var(--space-lg) 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

/* ── Cards ────────────────────────────────────────────────────────────────── */
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-xs);
}

.cardHeader {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md) var(--space-lg);
  border-bottom: 1px solid var(--color-border);
}

.cardHeaderBar {
  width: 3px;
  height: 16px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.cardTitle {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-secondary);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex: 1;
}

.count {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-normal);
  color: var(--color-text-tertiary);
  margin-left: auto;
}

.cardBody {
  padding: var(--space-lg);
}

/* ── Detalles ─────────────────────────────────────────────────────────────── */
.details {
  display: grid;
  grid-template-columns: repeat(2, 1fr);

  @media (width < 500px) {
    grid-template-columns: 1fr;
  }
}

.detailRow {
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--color-bg-subtle);
  border-right: 1px solid var(--color-bg-subtle);
  display: flex;
  flex-direction: column;
  gap: 2px;

  &:nth-child(2n) { border-right: none; }
  &:last-child { border-bottom: none; }
  &:nth-last-child(2):nth-child(2n+1) { border-bottom: none; }

  & dt {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }

  & dd {
    font-size: var(--font-size-sm);
    color: var(--color-text);
    word-break: break-word;
  }
}

.mono {
  font-family: var(--font-mono, monospace);
  font-size: var(--font-size-xs);
}

/* ── Notices ──────────────────────────────────────────────────────────────── */
.nuevoNotice {
  padding: var(--space-md);
  background: #f0f4ff;
  color: #4361b0;
  border: 1px solid #a3b8d8;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.bajaNotice {
  padding: var(--space-md);
  background: var(--color-danger-subtle);
  color: var(--color-danger);
  border: 1px solid var(--color-danger-light);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.prestamoNotice {
  padding: var(--space-md);
  background: var(--color-info-subtle);
  color: var(--color-info);
  border: 1px solid var(--color-info-light);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.loadingText,
.emptyText {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
  text-align: center;
  padding: var(--space-xl);
}
```

- [ ] **Step 2: Reestructurar el JSX del body**

Reemplazar el bloque `<div className={styles.content}>...</div>` (y sus hijos) con:

```tsx
{/* ── Body ─────────────────────────────────────────────────────── */}
<div className={styles.pageBody}>
  {/* Card: Información del equipo */}
  <div className={styles.card}>
    <div className={styles.cardHeader}>
      <div className={styles.cardHeaderBar} style={{ background: 'var(--color-primary)' }} />
      <h3 className={styles.cardTitle}>Información del equipo</h3>
    </div>
    <dl className={styles.details}>
      <div className={styles.detailRow}><dt>Tipo</dt><dd>{equipo.tipoEquipo.nombre}</dd></div>
      {equipo.template && <div className={styles.detailRow}><dt>Modelo</dt><dd>{equipo.template.nombre}</dd></div>}
      <div className={styles.detailRow}>
        <dt>Ubicación</dt>
        <dd>{equipo.oficina.seccion.ciudad.nombre} › {equipo.oficina.seccion.nombre} › {equipo.oficina.nombre}</dd>
      </div>
      {equipo.ip && <div className={styles.detailRow}><dt>IP</dt><dd className={styles.mono}>{equipo.ip}</dd></div>}
      {equipo.observacion && <div className={styles.detailRow}><dt>Observación</dt><dd>{equipo.observacion}</dd></div>}
      <div className={styles.detailRow}><dt>Registrado</dt><dd>{new Date(equipo.createdAt).toLocaleDateString('es-UY')}</dd></div>
    </dl>
  </div>

  {/* Notices */}
  {estadoReal === 'NUEVO' && (
    <div className={styles.nuevoNotice}>
      Equipo recién ingresado. Realizá una <strong>SALIDA</strong> para asignarlo a su oficina destino.
    </div>
  )}
  {estadoReal === 'EN_DEPOSITO' && (
    <div className={styles.bajaNotice}>
      Equipo en Depósito. Transferilo a una oficina activa para reasignarlo.
    </div>
  )}
  {estadoReal === 'PRESTADO' && (
    <div className={styles.prestamoNotice}>
      Equipo en préstamo. Gestioná la devolución desde la sección de Préstamos.
    </div>
  )}

  {/* Card: Acciones — se agrega en Task 4 */}

  {/* Card: Historial — se agrega en Task 5 */}
</div>
```

- [ ] **Step 3: Verificar visualmente**

La card de detalles debe mostrarse en 2 columnas, con labels en mayúsculas pequeñas y valores debajo. Los notices deben aparecer si corresponden.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/EquipmentDetailPage.module.css frontend/src/pages/EquipmentDetailPage.tsx
git commit -m "feat: layout columna única y cards de detalles"
```

---

### Task 4: Acciones — grid 2×2 con descripciones

**Files:**
- Modify: `frontend/src/pages/EquipmentDetailPage.module.css` (agregar al final)
- Modify: `frontend/src/pages/EquipmentDetailPage.tsx`

- [ ] **Step 1: Agregar CSS de acciones al final del módulo**

```css
/* ── Acciones ─────────────────────────────────────────────────────────────── */
.actionsGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-sm);

  @media (width < 500px) {
    grid-template-columns: 1fr;
  }
}

.actionBtn {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: left;

  &[data-variant="primary"] {
    background: var(--color-primary-light);
    color: var(--color-primary-dark);
    border-color: rgba(var(--color-primary-rgb), 0.3);
    &:hover { background: var(--color-primary); color: white; }
  }
  &[data-variant="warning"] {
    background: var(--color-warning-subtle);
    color: #92400e;
    border-color: var(--color-warning-light);
    &:hover { background: var(--color-warning); color: white; }
  }
  &[data-variant="danger"] {
    background: var(--color-danger-subtle);
    color: var(--color-danger);
    border-color: var(--color-danger-light);
    &:hover { background: var(--color-danger); color: white; }
  }
  &[data-variant="secondary"] {
    background: var(--color-bg);
    color: var(--color-text-secondary);
    border-color: var(--color-border-strong);
    &:hover { background: var(--color-secondary); color: white; }
  }
}

.actionBtnIcon {
  width: 30px;
  height: 30px;
  border-radius: var(--radius-sm);
  background: rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  .actionBtn:hover & { background: rgba(255, 255, 255, 0.2); }
}

.actionBtnText {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.actionBtnName {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  line-height: 1.2;
}

.actionBtnDesc {
  font-size: var(--font-size-xs);
  opacity: 0.65;
  font-weight: var(--font-weight-normal);
}
```

- [ ] **Step 2: Agregar campo `desc` al tipo de acciones disponibles en el TSX**

Localizar la constante `ACCIONES_POR_ESTADO` y reemplazarla con:

```tsx
const ACCIONES_POR_ESTADO: Record<string, { type: ActionType; label: string; desc: string; variant: string }[]> = {
  NUEVO: [
    { type: 'salida', label: 'SALIDA', desc: 'Asignar a oficina destino', variant: 'primary' },
  ],
  ACTIVO: [
    { type: 'entrada',  label: 'ENTRADA',                variant: 'warning',   desc: 'Retorno temporal a Soporte' },
    { type: 'transfer', label: 'Transferir',              variant: 'secondary', desc: 'Mover a otra oficina' },
    { type: 'service',  label: 'Servicio Externo',        variant: 'warning',   desc: 'Enviar a reparación' },
  ],
  EN_REPARACION: [
    { type: 'salida',   label: 'SALIDA',                  variant: 'primary',   desc: 'Devolver a su oficina' },
    { type: 'service',  label: 'Servicio Externo',        variant: 'warning',   desc: 'Enviar a reparación' },
  ],
  EN_DEPOSITO: [
    { type: 'salida',   label: 'SALIDA',                  variant: 'primary',   desc: 'Asignar a oficina' },
  ],
  EN_SERVICIO_EXTERNO: [
    { type: 'returnService', label: 'Registrar retorno', variant: 'primary',   desc: 'Confirmar regreso del servicio' },
  ],
  PRESTADO: [],
};
```

- [ ] **Step 3: Actualizar el bloque de acciones en el JSX**

Reemplazar el comentario `{/* Card: Acciones — se agrega en Task 4 */}` con:

```tsx
{/* Card: Acciones */}
{accionesDisponibles.length > 0 && (
  <div className={styles.card}>
    <div className={styles.cardHeader}>
      <div className={styles.cardHeaderBar} style={{ background: 'var(--color-secondary)' }} />
      <h3 className={styles.cardTitle}>Acciones</h3>
    </div>
    <div className={styles.cardBody}>
      <div className={styles.actionsGrid}>
        {accionesDisponibles.map((a) => {
          const Icon = ACCION_ICON[a.type];
          return (
            <button
              key={a.type}
              className={styles.actionBtn}
              data-variant={a.variant}
              onClick={() => openAction(a.type)}
            >
              <div className={styles.actionBtnIcon}>
                <Icon size={15} />
              </div>
              <div className={styles.actionBtnText}>
                <span className={styles.actionBtnName}>{a.label}</span>
                <span className={styles.actionBtnDesc}>{a.desc}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 4: Verificar visualmente**

Los botones de acción deben aparecer en grid 2 columnas, cada uno con ícono + nombre + descripción corta. En estados con 1 o 3 acciones el grid se acomoda naturalmente.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/EquipmentDetailPage.module.css frontend/src/pages/EquipmentDetailPage.tsx
git commit -m "feat: card de acciones con grid 2x2 y descripciones"
```

---

### Task 5: Timeline y hero JSX — CSS + JSX final

**Files:**
- Modify: `frontend/src/pages/EquipmentDetailPage.module.css` (agregar al final)
- Modify: `frontend/src/pages/EquipmentDetailPage.tsx`

- [ ] **Step 1: Agregar CSS del timeline + modal al final del módulo**

```css
/* ── Timeline ─────────────────────────────────────────────────────────────── */
.timeline {
  display: flex;
  flex-direction: column;
}

.timelineItem {
  display: grid;
  grid-template-columns: 28px 1fr;
  gap: 0 var(--space-md);
  position: relative;
}

.timelineLine {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.timelineDot {
  width: 14px;
  height: 14px;
  border-radius: var(--radius-full);
  border: 2px solid currentColor;
  background: var(--color-surface);
  flex-shrink: 0;
  margin-top: 3px;
  z-index: 1;

  &[data-color="success"] { color: #16a34a; }
  &[data-color="warning"] { color: var(--color-warning); }
  &[data-color="danger"]  { color: var(--color-danger); }
  &[data-color="info"]    { color: var(--color-info); }
  &[data-color="primary"] { color: var(--color-primary); }
  &[data-color="neutral"] { color: var(--color-text-tertiary); }
}

.timelineConnector {
  width: 2px;
  flex: 1;
  background: var(--color-border);
  margin: 3px 0;
  min-height: var(--space-md);
}

.timelineContent {
  padding-bottom: var(--space-lg);

  .timelineItem:last-child & { padding-bottom: 0; }
}

.timelineHeader {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
  flex-wrap: wrap;
  margin-bottom: 2px;
}

.timelineAccion {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);

  &[data-color="success"] { color: #16a34a; }
  &[data-color="warning"] { color: var(--color-warning); }
  &[data-color="danger"]  { color: var(--color-danger); }
  &[data-color="info"]    { color: var(--color-info); }
  &[data-color="primary"] { color: var(--color-primary); }
  &[data-color="neutral"] { color: var(--color-text-secondary); }
}

.timelineFecha {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  white-space: nowrap;
  margin-left: auto;
}

.timelineMotivo {
  font-size: var(--font-size-sm);
  color: var(--color-text);
  line-height: var(--line-height-snug);
  margin-bottom: 2px;
}

.timelineUbicacion {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-bottom: 2px;
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  flex-wrap: wrap;
}

.timelineTecnico {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  font-style: italic;
}

/* ── Modal ────────────────────────────────────────────────────────────────── */
.overlay {
  position: fixed;
  inset: 0;
  background: rgb(0 0 0 / 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  padding: var(--space-lg);
}

.modal {
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: var(--space-xl);
  width: 100%;
  max-width: 480px;
  max-height: 90dvh;
  overflow-y: auto;
  box-shadow: var(--shadow-xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.modalTitle {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-secondary);
}

.modalEquipo {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  padding: var(--space-sm) var(--space-md);
  background: var(--color-bg);
  border-radius: var(--radius-md);
  border-left: 3px solid var(--color-primary);
}

.modalError {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
}

.modalWarning {
  background: var(--color-warning-subtle);
  color: #92400e;
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  border-left: 3px solid var(--color-warning);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.entradaInfo {
  background: #f0f4ff;
  color: #4361b0;
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  border-left: 3px solid #4361b0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);

  & strong { font-weight: var(--font-weight-bold); }
}

.modalForm {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.locationCascade {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.labelRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.newLocBtn {
  font-size: var(--font-size-xs);
  color: var(--color-primary);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  padding: 1px 6px;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
  &:hover { background: var(--color-primary); color: white; }
}

.inlineCreate {
  display: flex;
  gap: var(--space-xs);
  align-items: center;
  & .input { flex: 1; }
}

.inlineConfirm {
  padding: var(--space-xs) var(--space-sm);
  background: var(--color-primary);
  color: white;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  flex-shrink: 0;
  transition: background var(--transition-fast);
  &:hover:not(:disabled) { background: var(--color-primary-dark); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

.inlineCancel {
  padding: var(--space-xs) var(--space-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
  flex-shrink: 0;
  transition: all var(--transition-fast);
  &:hover { border-color: var(--color-danger); color: var(--color-danger); }
}

.label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.select, .input, .textarea {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: var(--color-text);
  background: var(--color-bg);
  transition: border-color var(--transition-fast);
  font-family: inherit;

  &:focus { outline: none; border-color: var(--color-primary); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

.textarea { resize: vertical; min-height: 80px; }

.modalActions {
  display: flex;
  gap: var(--space-sm);
  justify-content: flex-end;
  margin-top: var(--space-xs);
}

.cancelBtn {
  padding: var(--space-sm) var(--space-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  cursor: pointer;
  background: var(--color-surface);
  &:hover { background: var(--color-bg); }
}

.confirmBtn {
  padding: var(--space-sm) var(--space-lg);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  transition: all var(--transition-fast);

  &[data-variant="primary"] { background: var(--color-primary); color: white; &:hover:not(:disabled) { background: var(--color-primary-dark); } }
  &[data-variant="warning"] { background: var(--color-warning); color: white; &:hover:not(:disabled) { background: var(--color-warning-hover); } }
  &[data-variant="danger"]  { background: var(--color-danger);  color: white; &:hover:not(:disabled) { background: var(--color-danger-hover); } }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
}

/* ── Responsive final ─────────────────────────────────────────────────────── */
@media (width < 640px) {
  .hero { padding: var(--space-lg); }
  .heroTitle { font-size: var(--font-size-2xl); }
  .heroIcon { width: 40px; height: 40px; }
  .cardBody { padding: var(--space-md); }
}
```

- [ ] **Step 2: Reemplazar el bloque header con el hero en el JSX**

Reemplazar `<div className={styles.header}>...</div>` (el header actual, con backBtn, headerInfo, editBtn) con:

```tsx
{/* ── Hero ──────────────────────────────────────────────────────── */}
<div className={styles.hero}>
  <div className={styles.heroNav}>
    <button className={styles.backBtn} onClick={() => navigate('/equipos')}>
      <ChevronLeft size={14} />
      Volver a equipos
    </button>
  </div>
  <div className={styles.heroBody}>
    <div className={styles.heroIdentity}>
      <div className={styles.heroIcon}>
        <Monitor size={22} />
      </div>
      <div>
        <div className={styles.heroTitle}>Serie {equipo.serie}</div>
        <div className={styles.heroSubtitle}>
          {equipo.tipoEquipo.nombre}{equipo.template ? ` · ${equipo.template.nombre}` : ''}
        </div>
        <div className={styles.heroLocation}>
          <div className={styles.heroLocationDot} />
          {equipo.oficina.seccion.ciudad.nombre} · {equipo.oficina.seccion.nombre} · {equipo.oficina.nombre}
        </div>
      </div>
    </div>
    <div className={styles.heroRight}>
      <span className={styles.heroBadge} data-color={STATUS_COLOR[estadoReal] || 'neutral'}>
        {STATUS_LABEL[estadoReal] || estadoReal}
      </span>
      <button className={styles.editBtn} onClick={() => navigate(`/equipos/${id}/editar`)}>
        <Pencil size={14} />
        Editar
      </button>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Agregar `Monitor` al import de lucide-react**

Localizar la línea de imports de lucide-react y agregar `Monitor`:

```tsx
import { ArrowRightLeft, Building2, RotateCcw, Pencil, ChevronLeft, LogOut, LogIn, Monitor } from 'lucide-react';
```

- [ ] **Step 4: Reemplazar el comentario de historial con la card real**

Reemplazar `{/* Card: Historial — se agrega en Task 5 */}` con:

```tsx
{/* Card: Historial */}
<div className={styles.card}>
  <div className={styles.cardHeader}>
    <div className={styles.cardHeaderBar} style={{ background: 'var(--color-info)' }} />
    <h3 className={styles.cardTitle}>
      Historial de acciones
      {historial && <span className={styles.count}>{historial.length} registros</span>}
    </h3>
  </div>
  <div className={styles.cardBody}>
    {loadingHistory ? (
      <p className={styles.loadingText}>Cargando historial...</p>
    ) : historial && historial.length > 0 ? (
      <div className={styles.timeline}>
        {[...historial].sort((a, b) => {
          const dateA = new Date(a.fecha).toDateString();
          const dateB = new Date(b.fecha).toDateString();
          if (dateA === dateB) {
            if (a.accion === 'CREACION') return 1;
            if (b.accion === 'CREACION') return -1;
          }
          return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
        }).map((entry, index, arr) => (
          <div key={entry.id} className={styles.timelineItem}>
            <div className={styles.timelineLine}>
              <div className={styles.timelineDot} data-color={ACCION_COLOR[entry.accion] || 'neutral'} />
              {index < arr.length - 1 && <div className={styles.timelineConnector} />}
            </div>
            <div className={styles.timelineContent}>
              <div className={styles.timelineHeader}>
                <span className={styles.timelineAccion} data-color={ACCION_COLOR[entry.accion] || 'neutral'}>
                  {ACCION_LABEL[entry.accion] || entry.accion}
                </span>
                <span className={styles.timelineFecha}>
                  {new Date(entry.fecha).toLocaleDateString('es-UY', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <p className={styles.timelineMotivo}>{entry.motivo}</p>
              {(entry.oficinaOrigen || entry.oficinaDestino) && (
                <p className={styles.timelineUbicacion}>
                  {entry.oficinaOrigen && <span>{entry.oficinaOrigen.nombre}</span>}
                  {entry.oficinaOrigen && entry.oficinaDestino && <ArrowRightLeft size={10} />}
                  {entry.oficinaDestino && <span>{entry.oficinaDestino.nombre}</span>}
                </p>
              )}
              <p className={styles.timelineTecnico}>por {entry.usuario.nombre}</p>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <p className={styles.emptyText}>Sin historial registrado</p>
    )}
  </div>
</div>
```

- [ ] **Step 5: Verificar la página completa**

Revisar:
- Hero con gradiente navy y círculos decorativos de fondo
- Fila bento con 4 celdas (ubicación resaltada en teal sutil)
- Card de detalles en 2 columnas
- Card de acciones en grid 2×2 con ícono + nombre + descripción
- Timeline con línea vertical, dots de colores y conector entre items
- Modal de acción (abrir cualquier acción y verificar que funciona)
- Notices de estado (NUEVO/EN_DEPOSITO/PRESTADO) si corresponden

- [ ] **Step 6: Build final**

```bash
cd frontend && npx tsc --noEmit
```

Verificar que no hay errores de TypeScript.

- [ ] **Step 7: Commit final**

```bash
git add frontend/src/pages/EquipmentDetailPage.module.css frontend/src/pages/EquipmentDetailPage.tsx
git commit -m "feat: rediseño completo ficha de equipo — hero, bento, timeline"
```

---

## Resumen de commits esperados

1. `feat: hero + bento row en ficha de equipo` (Task 2)
2. `feat: layout columna única y cards de detalles` (Task 3)
3. `feat: card de acciones con grid 2x2 y descripciones` (Task 4)
4. `feat: rediseño completo ficha de equipo — hero, bento, timeline` (Task 5)
