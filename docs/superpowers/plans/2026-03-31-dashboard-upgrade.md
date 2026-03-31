# Dashboard Upgrade — Implementation Plan (Fase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ampliar el dashboard con 6 stats, 4 widgets de alerta/acciones/tipo reorganizables vía drag-and-drop, y filtro en actividad reciente. Fase 1 solamente (sin Recharts).

**Architecture:** El backend agrega 3 endpoints nuevos en `/dashboard/` y extiende `/stats`. El frontend extrae los widgets a `frontend/src/components/dashboard/widgets/` y los enmarca en un `DashboardGrid` con `@dnd-kit/sortable`, cuyo orden persiste en `localStorage`. `DashboardPage.tsx` se simplifica a orquestador.

**Tech Stack:** Express 5 + Prisma 7 (backend), React 19 + TanStack Query + @dnd-kit/core + @dnd-kit/sortable + CSS Modules (frontend). No Recharts en Fase 1.

---

## Mapa de archivos

### Backend (modificar)
- `backend/src/modules/dashboard/dashboard.service.ts` — agregar `getLoansAlerts`, `getRepairAlerts`, `getEquipmentByType`; extender `getStats` con `enServicioExterno`
- `backend/src/modules/dashboard/dashboard.controller.ts` — agregar handlers para los 3 endpoints nuevos; extender `recentActivityHandler` con filtro `?accion=`
- `backend/src/modules/dashboard/dashboard.routes.ts` — registrar las 3 rutas nuevas

### Frontend (modificar)
- `frontend/src/hooks/useDashboard.ts` — agregar `useLoansAlerts`, `useRepairAlerts`, `useEquipmentByType`; extender `useRecentActivity` con param `accion`; extender interfaz `DashboardStats` con `enServicioExterno` y `equiposNuevos`
- `frontend/src/pages/DashboardPage.tsx` — simplificar: solo welcome + StatsRow + DashboardGrid
- `frontend/src/pages/DashboardPage.module.css` — quitar estilos de cards/activity (se mueven a widgets)

### Frontend (crear)
- `frontend/src/components/dashboard/DashboardGrid.tsx` — contenedor DnD, lee/guarda orden en localStorage
- `frontend/src/components/dashboard/DashboardGrid.module.css` — grid de 2 columnas, activity full-width
- `frontend/src/components/dashboard/widgets/StatsRow.tsx` — 6 stat cards (no draggable)
- `frontend/src/components/dashboard/widgets/StatsRow.module.css` — estilos del grid de stats (mover desde DashboardPage.module.css)
- `frontend/src/components/dashboard/widgets/Widget.module.css` — estilos base compartidos (card container, header, drag handle)
- `frontend/src/components/dashboard/widgets/QuickActionsWidget.tsx` — 3 botones de navegación
- `frontend/src/components/dashboard/widgets/LoansAlertWidget.tsx` — préstamos sin devolver con semáforo
- `frontend/src/components/dashboard/widgets/RepairAlertWidget.tsx` — equipos en reparación prolongada
- `frontend/src/components/dashboard/widgets/EquipmentByTypeWidget.tsx` — desglose por tipo con barras CSS
- `frontend/src/components/dashboard/widgets/ActivityFeedWidget.tsx` — actividad reciente con filtro por acción

---

## Task 1: Backend — nuevos endpoints de servicio

**Files:**
- Modify: `backend/src/modules/dashboard/dashboard.service.ts`

- [ ] **Step 1: Extender `getStats` con `enServicioExterno` y exponer `equiposNuevos`**

Reemplazar la función `getStats` existente con la siguiente. Los únicos cambios son: agregar `enServicioExterno` en el destructuring de `Promise.all`, incluirlo en el cálculo de `activos`, y exponerlo en el objeto retornado:

```typescript
export async function getStats() {
  const [
    totalEquipos,
    equiposNuevos,
    enDeposito,
    enReparacion,
    enServicioExterno,
    prestamosActivos,
    totalOficinas,
  ] = await Promise.all([
    prisma.equipo.count(),
    prisma.equipo.count({ where: { estado: 'NUEVO' } }),
    prisma.equipo.count({
      where: {
        estado: { notIn: ESTADOS_ESPECIALES },
        oficina: {
          OR: [
            { nombre: { contains: 'deposito', mode: 'insensitive' } },
            { nombre: { contains: 'depósito', mode: 'insensitive' } },
          ],
        },
      },
    }),
    prisma.equipo.count({
      where: {
        estado: { notIn: ESTADOS_ESPECIALES },
        oficina: { nombre: { contains: 'soporte', mode: 'insensitive' } },
      },
    }),
    prisma.equipo.count({ where: { estado: 'EN_SERVICIO_EXTERNO' } }),
    prisma.prestamo.count({ where: { fechaDevolucion: null } }),
    prisma.oficina.count(),
  ]);

  const activos = totalEquipos - equiposNuevos - enDeposito - enReparacion - enServicioExterno - prestamosActivos;

  return {
    totalEquipos,
    equiposNuevos,
    activos: Math.max(0, activos),
    enReparacion,
    enDeposito,
    enServicioExterno,
    prestamosActivos,
    totalUbicaciones: totalOficinas,
  };
}
```

- [ ] **Step 2: Agregar función `getLoansAlerts`**

Agregar al final de `dashboard.service.ts`, antes del cierre del archivo:

```typescript
export async function getLoansAlerts(limit = 5) {
  const loans = await prisma.prestamo.findMany({
    where: { fechaDevolucion: null },
    orderBy: { fechaPrestamo: 'asc' },
    take: limit,
    include: {
      equipo: {
        select: {
          serie: true,
          modelo: true,
          tipoEquipo: { select: { nombre: true } },
        },
      },
      solicitante: { select: { nombre: true } },  // schema usa "solicitante" no "funcionario"
    },
  });

  const now = new Date();
  return loans.map((loan) => ({
    id: loan.id,
    fechaPrestamo: loan.fechaPrestamo.toISOString(),
    diasTranscurridos: Math.floor((now.getTime() - loan.fechaPrestamo.getTime()) / 86400000),
    equipo: loan.equipo,
    funcionario: loan.solicitante,  // mapear a "funcionario" para la API
  }));
}
```

- [ ] **Step 3: Agregar función `getRepairAlerts`**

Agregar al final de `dashboard.service.ts`:

```typescript
export async function getRepairAlerts(limit = 5) {
  // Equipos cuya oficina contiene "soporte" (estado EN_REPARACION derivado)
  const equipos = await prisma.equipo.findMany({
    where: {
      estado: { notIn: ESTADOS_ESPECIALES },
      oficina: { nombre: { contains: 'soporte', mode: 'insensitive' } },
    },
    select: {
      id: true,
      serie: true,
      modelo: true,
      tipoEquipo: { select: { nombre: true } },
      historial: {
        where: { accion: 'ENVIO_SOPORTE' },
        orderBy: { fecha: 'desc' },
        take: 1,
        select: { fecha: true },
      },
    },
  });

  const now = new Date();
  const result = equipos.map((eq) => {
    const fechaIngreso = eq.historial[0]?.fecha ?? new Date(0);
    return {
      id: eq.id,
      serie: eq.serie,
      modelo: eq.modelo,
      tipoEquipo: eq.tipoEquipo,
      diasEnReparacion: Math.floor((now.getTime() - fechaIngreso.getTime()) / 86400000),
      fechaIngreso: fechaIngreso.toISOString(),
    };
  });

  // Ordenar por días en reparación descendente (más tiempo primero)
  result.sort((a, b) => b.diasEnReparacion - a.diasEnReparacion);
  return result.slice(0, limit);
}
```

- [ ] **Step 4: Agregar función `getEquipmentByType`**

Agregar al final de `dashboard.service.ts`:

```typescript
export async function getEquipmentByType() {
  const grouped = await prisma.equipo.groupBy({
    by: ['tipoEquipoId'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 8,
  });

  // Obtener nombres de los tipos
  const ids = grouped.map((g) => g.tipoEquipoId);
  const tipos = await prisma.tipoEquipo.findMany({
    where: { id: { in: ids } },
    select: { id: true, nombre: true },
  });

  const tipoMap = new Map(tipos.map((t) => [t.id, t.nombre]));

  return grouped.map((g) => ({
    tipoNombre: tipoMap.get(g.tipoEquipoId) ?? 'Desconocido',
    count: g._count.id,
  }));
}
```

- [ ] **Step 5: Extender `getRecentActivity` con filtro por acción**

Reemplazar la función `getRecentActivity` existente:

```typescript
export async function getRecentActivity(limit = 20, accion?: string) {
  return prisma.historial.findMany({
    where: accion ? { accion: accion as any } : undefined,
    include: {
      equipo: { select: { id: true, serie: true, modelo: true, tipoEquipo: { select: { nombre: true } } } },
      usuario: { select: { nombre: true, ficha: true } },
      oficinaOrigen: { select: { nombre: true } },
      oficinaDestino: { select: { nombre: true } },
    },
    orderBy: { fecha: 'desc' },
    take: limit,
  });
}
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/dashboard/dashboard.service.ts
git commit -m "feat(dashboard): agregar servicios loans-alerts, repair-alerts, equipment-by-type y filtro accion"
```

---

## Task 2: Backend — nuevos controllers y rutas

**Files:**
- Modify: `backend/src/modules/dashboard/dashboard.controller.ts`
- Modify: `backend/src/modules/dashboard/dashboard.routes.ts`

- [ ] **Step 1: Reemplazar `dashboard.controller.ts` completo**

```typescript
import type { Request, Response } from 'express';
import * as dashboardService from './dashboard.service.js';

export async function statsHandler(_req: Request, res: Response) {
  const stats = await dashboardService.getStats();
  res.json(stats);
}

export async function recentActivityHandler(req: Request, res: Response) {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const accion = typeof req.query.accion === 'string' ? req.query.accion : undefined;
  const activity = await dashboardService.getRecentActivity(limit, accion);
  res.json(activity);
}

export async function loansAlertsHandler(req: Request, res: Response) {
  const limit = Math.min(Number(req.query.limit) || 5, 20);
  const data = await dashboardService.getLoansAlerts(limit);
  res.json(data);
}

export async function repairAlertsHandler(req: Request, res: Response) {
  const limit = Math.min(Number(req.query.limit) || 5, 20);
  const data = await dashboardService.getRepairAlerts(limit);
  res.json(data);
}

export async function equipmentByTypeHandler(_req: Request, res: Response) {
  const data = await dashboardService.getEquipmentByType();
  res.json(data);
}
```

- [ ] **Step 2: Reemplazar `dashboard.routes.ts` completo**

```typescript
import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.js';
import * as controller from './dashboard.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/stats', controller.statsHandler);
router.get('/recent-activity', controller.recentActivityHandler);
router.get('/loans-alerts', controller.loansAlertsHandler);
router.get('/repair-alerts', controller.repairAlertsHandler);
router.get('/equipment-by-type', controller.equipmentByTypeHandler);

export default router;
```

- [ ] **Step 3: Verificar que el backend compila sin errores**

```bash
cd backend && npx tsc --noEmit
```

Expected: sin output (0 errores)

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/dashboard/dashboard.controller.ts backend/src/modules/dashboard/dashboard.routes.ts
git commit -m "feat(dashboard): registrar endpoints loans-alerts, repair-alerts, equipment-by-type"
```

---

## Task 3: Frontend — instalar @dnd-kit y extender hooks

**Files:**
- Modify: `frontend/src/hooks/useDashboard.ts`

- [ ] **Step 1: Instalar dependencias DnD**

```bash
cd frontend && npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Expected: se instalan `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` sin errores

- [ ] **Step 2: Reemplazar `useDashboard.ts` completo**

```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';

export interface DashboardStats {
  totalEquipos: number;
  activos: number;
  enReparacion: number;
  dadosDeBaja: number;
  enDeposito: number;
  enServicioExterno: number;
  equiposNuevos: number;
  prestamosActivos: number;
  totalUbicaciones: number;
}

export interface RecentActivity {
  id: number;
  accion: string;
  motivo: string;
  fecha: string;
  equipo: { id: number; serie: number; modelo: string | null; tipoEquipo: { nombre: string } } | null;
  usuario: { nombre: string; ficha: number };
  oficinaOrigen: { nombre: string } | null;
  oficinaDestino: { nombre: string } | null;
}

export interface LoanAlert {
  id: number;
  fechaPrestamo: string;
  diasTranscurridos: number;
  equipo: { serie: number; modelo: string | null; tipoEquipo: { nombre: string } };
  funcionario: { nombre: string };
}

export interface RepairAlert {
  id: number;
  serie: number;
  modelo: string | null;
  tipoEquipo: { nombre: string };
  diasEnReparacion: number;
  fechaIngreso: string;
}

export interface EquipmentByType {
  tipoNombre: string;
  count: number;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => api.get<DashboardStats>('/dashboard/stats'),
    staleTime: 30_000,
  });
}

export function useRecentActivity(limit = 20, accion?: string) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (accion) params.set('accion', accion);
  return useQuery({
    queryKey: ['dashboard', 'recent-activity', limit, accion ?? null],
    queryFn: () => api.get<RecentActivity[]>(`/dashboard/recent-activity?${params}`),
    staleTime: 30_000,
  });
}

export function useLoansAlerts(limit = 5) {
  return useQuery({
    queryKey: ['dashboard', 'loans-alerts', limit],
    queryFn: () => api.get<LoanAlert[]>(`/dashboard/loans-alerts?limit=${limit}`),
    staleTime: 30_000,
  });
}

export function useRepairAlerts(limit = 5) {
  return useQuery({
    queryKey: ['dashboard', 'repair-alerts', limit],
    queryFn: () => api.get<RepairAlert[]>(`/dashboard/repair-alerts?limit=${limit}`),
    staleTime: 30_000,
  });
}

export function useEquipmentByType() {
  return useQuery({
    queryKey: ['dashboard', 'equipment-by-type'],
    queryFn: () => api.get<EquipmentByType[]>('/dashboard/equipment-by-type'),
    staleTime: 60_000,
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useDashboard.ts frontend/package.json frontend/package-lock.json
git commit -m "feat(dashboard): hooks para loans-alerts, repair-alerts, equipment-by-type y filtro accion"
```

---

## Task 4: Frontend — estilos base de widgets

**Files:**
- Create: `frontend/src/components/dashboard/widgets/Widget.module.css`
- Create: `frontend/src/components/dashboard/widgets/StatsRow.module.css`

- [ ] **Step 1: Crear `Widget.module.css`**

```css
/* Contenedor base para todos los widgets draggable */
.widget {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
}

.widgetDragging {
  opacity: 0.5;
  box-shadow: var(--shadow-lg);
}

/* Header del widget */
.widgetHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md) var(--space-xl);
  border-bottom: 1px solid var(--color-border);
  gap: var(--space-sm);
}

.widgetTitle {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: var(--space-sm);

  &::before {
    content: '';
    width: 3px;
    height: 16px;
    background: var(--color-primary);
    border-radius: var(--radius-full);
  }
}

.widgetLink {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
  transition: color var(--transition-fast);
  white-space: nowrap;
  &:hover { color: var(--color-primary-hover); }
}

.dragHandle {
  cursor: grab;
  color: var(--color-text-tertiary);
  display: flex;
  align-items: center;
  padding: 2px;
  border-radius: var(--radius-sm);
  transition: color var(--transition-fast), background var(--transition-fast);

  &:hover {
    color: var(--color-text-secondary);
    background: var(--color-bg);
  }
  &:active { cursor: grabbing; }
}

/* Body del widget */
.widgetBody {
  padding: var(--space-lg) var(--space-xl);
  flex: 1;
}

.emptyText {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
  text-align: center;
  padding: var(--space-xl) 0;
}

.loadingText {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
  text-align: center;
  padding: var(--space-xl) 0;
}
```

- [ ] **Step 2: Crear `StatsRow.module.css`**

```css
.statsGrid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: var(--space-md);
}

.statCard {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition:
    transform var(--transition-base),
    box-shadow var(--transition-base),
    border-color var(--transition-base);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    background: var(--card-accent, var(--color-border));
  }

  &:hover {
    transform: translateY(-3px);
    box-shadow: var(--shadow-md);
    border-color: var(--color-border-strong);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  &[data-color="success"]  { --card-accent: var(--color-success); }
  &[data-color="warning"]  { --card-accent: var(--color-warning); }
  &[data-color="danger"]   { --card-accent: var(--color-danger);  }
  &[data-color="info"]     { --card-accent: var(--color-info);    }
  &[data-color="neutral"]  { --card-accent: var(--color-primary); }
  &[data-color="indigo"]   { --card-accent: #6366f1; }
  &[data-color="purple"]   { --card-accent: #8b5cf6; }
}

.statHeader {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.statIcon {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;

  .statCard[data-color="success"] & { background: var(--color-success-subtle); color: var(--color-success); }
  .statCard[data-color="warning"] & { background: var(--color-warning-subtle); color: var(--color-warning); }
  .statCard[data-color="danger"]  & { background: var(--color-danger-subtle);  color: var(--color-danger);  }
  .statCard[data-color="info"]    & { background: var(--color-info-subtle);    color: var(--color-info);    }
  .statCard[data-color="neutral"] & { background: var(--color-primary-subtle); color: var(--color-primary); }
  .statCard[data-color="indigo"]  & { background: #eef2ff; color: #6366f1; }
  .statCard[data-color="purple"]  & { background: #f5f3ff; color: #8b5cf6; }
}

.statArrow {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  opacity: 0;
  transition: opacity var(--transition-fast), transform var(--transition-fast);

  .statCard:hover & {
    opacity: 1;
    transform: translateX(2px);
  }
}

.statBody {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.statValue {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-black);
  line-height: 1;
  letter-spacing: -0.02em;

  .statCard[data-color="success"] & { color: var(--color-success); }
  .statCard[data-color="warning"] & { color: var(--color-warning); }
  .statCard[data-color="danger"]  & { color: var(--color-danger);  }
  .statCard[data-color="info"]    & { color: var(--color-info);    }
  .statCard[data-color="neutral"] & { color: var(--color-primary); }
  .statCard[data-color="indigo"]  & { color: #6366f1; }
  .statCard[data-color="purple"]  & { color: #8b5cf6; }
}

.statLabel {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-medium);
}

/* ─── Responsive ─── */
@media (width < 1280px) {
  .statsGrid { grid-template-columns: repeat(3, 1fr); }
}

@media (width < 768px) {
  .statsGrid { grid-template-columns: repeat(2, 1fr); gap: var(--space-sm); }
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/dashboard/widgets/Widget.module.css frontend/src/components/dashboard/widgets/StatsRow.module.css
git commit -m "feat(dashboard): estilos base de widgets y stats row"
```

---

## Task 5: Frontend — StatsRow widget (6 tarjetas)

**Files:**
- Create: `frontend/src/components/dashboard/widgets/StatsRow.tsx`

- [ ] **Step 1: Crear `StatsRow.tsx`**

```typescript
import { useNavigate } from 'react-router';
import {
  CheckCircle2, Wrench, Package, Sparkles,
  ArrowLeftRight, MapPin, Wrench as ServiceIcon,
} from 'lucide-react';
import type { DashboardStats } from '../../../hooks/useDashboard';
import styles from './StatsRow.module.css';

interface StatsRowProps {
  stats: DashboardStats | undefined;
  loading: boolean;
}

export default function StatsRow({ stats, loading }: StatsRowProps) {
  const navigate = useNavigate();

  return (
    <div className={styles.statsGrid}>
      <StatCard
        label="Equipos Activos"
        value={stats?.activos}
        loading={loading}
        color="success"
        icon={<CheckCircle2 size={20} strokeWidth={1.75} />}
        onClick={() => navigate('/equipos?estado=ACTIVO')}
      />
      <StatCard
        label="En Reparación"
        value={stats?.enReparacion}
        loading={loading}
        color="warning"
        icon={<Wrench size={20} strokeWidth={1.75} />}
        onClick={() => navigate('/equipos?estado=EN_REPARACION')}
      />
      <StatCard
        label="En Depósito"
        value={stats?.enDeposito}
        loading={loading}
        color="neutral"
        icon={<Package size={20} strokeWidth={1.75} />}
        onClick={() => navigate('/equipos?estado=EN_DEPOSITO')}
      />
      <StatCard
        label="Nuevos"
        value={stats?.equiposNuevos}
        loading={loading}
        color="indigo"
        icon={<Sparkles size={20} strokeWidth={1.75} />}
        onClick={() => navigate('/equipos?estado=NUEVO')}
      />
      <StatCard
        label="Préstamos Activos"
        value={stats?.prestamosActivos}
        loading={loading}
        color="info"
        icon={<ArrowLeftRight size={20} strokeWidth={1.75} />}
        onClick={() => navigate('/prestamos')}
      />
      <StatCard
        label="Ubicaciones"
        value={stats?.totalUbicaciones}
        loading={loading}
        color="purple"
        icon={<MapPin size={20} strokeWidth={1.75} />}
        onClick={() => navigate('/ubicaciones')}
      />
    </div>
  );
}

function StatCard({ label, value, loading, color, icon, onClick }: {
  label: string;
  value: number | undefined;
  loading: boolean;
  color: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <div className={styles.statCard} data-color={color} onClick={onClick} role="button" tabIndex={0}>
      <div className={styles.statHeader}>
        <div className={styles.statIcon}>{icon}</div>
        <span className={styles.statArrow}>→</span>
      </div>
      <div className={styles.statBody}>
        <span className={styles.statValue}>{loading ? '—' : (value ?? 0)}</span>
        <span className={styles.statLabel}>{label}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/dashboard/widgets/StatsRow.tsx
git commit -m "feat(dashboard): StatsRow con 6 stat cards"
```

---

## Task 6: Frontend — QuickActionsWidget

**Files:**
- Create: `frontend/src/components/dashboard/widgets/QuickActionsWidget.tsx`

- [ ] **Step 1: Crear `QuickActionsWidget.tsx`**

```typescript
import { useNavigate } from 'react-router';
import { PlusCircle, ArrowLeftRight, Wrench } from 'lucide-react';
import widgetStyles from './Widget.module.css';

export default function QuickActionsWidget() {
  const navigate = useNavigate();

  const actions = [
    {
      label: 'Nuevo equipo',
      description: 'Registrar equipo nuevo',
      icon: <PlusCircle size={18} strokeWidth={1.75} />,
      onClick: () => navigate('/equipos/nuevo'),
      color: 'success' as const,
    },
    {
      label: 'Registrar préstamo',
      description: 'Prestar equipo a funcionario',
      icon: <ArrowLeftRight size={18} strokeWidth={1.75} />,
      onClick: () => navigate('/prestamos'),
      color: 'info' as const,
    },
    {
      label: 'Ver reparaciones',
      description: 'Equipos en soporte actualmente',
      icon: <Wrench size={18} strokeWidth={1.75} />,
      onClick: () => navigate('/equipos?estado=EN_REPARACION'),
      color: 'warning' as const,
    },
  ];

  return (
    <div className={widgetStyles.widget}>
      <div className={widgetStyles.widgetHeader}>
        <h3 className={widgetStyles.widgetTitle}>Acciones Rápidas</h3>
      </div>
      <div className={widgetStyles.widgetBody}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-md)',
                padding: 'var(--space-md) var(--space-lg)',
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                transition: 'background var(--transition-fast), border-color var(--transition-fast)',
                textAlign: 'left',
                width: '100%',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border-strong)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--color-bg)';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
              }}
            >
              <span style={{ color: 'var(--color-primary)', flexShrink: 0 }}>{action.icon}</span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text)' }}>
                  {action.label}
                </span>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                  {action.description}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/dashboard/widgets/QuickActionsWidget.tsx
git commit -m "feat(dashboard): QuickActionsWidget con 3 acciones de navegación"
```

---

## Task 7: Frontend — LoansAlertWidget

**Files:**
- Create: `frontend/src/components/dashboard/widgets/LoansAlertWidget.tsx`

- [ ] **Step 1: Crear `LoansAlertWidget.tsx`**

```typescript
import { useNavigate } from 'react-router';
import { useLoansAlerts } from '../../../hooks/useDashboard';
import widgetStyles from './Widget.module.css';

function urgencyColor(dias: number): string {
  if (dias > 30) return 'var(--color-danger)';
  if (dias >= 14) return 'var(--color-warning)';
  return 'var(--color-success)';
}

export default function LoansAlertWidget() {
  const navigate = useNavigate();
  const { data: loans, isLoading } = useLoansAlerts(5);

  return (
    <div className={widgetStyles.widget}>
      <div className={widgetStyles.widgetHeader}>
        <h3 className={widgetStyles.widgetTitle}>Préstamos sin devolver</h3>
        <button className={widgetStyles.widgetLink} onClick={() => navigate('/prestamos')}>
          Ver todos →
        </button>
      </div>
      <div className={widgetStyles.widgetBody}>
        {isLoading ? (
          <p className={widgetStyles.loadingText}>Cargando...</p>
        ) : !loans || loans.length === 0 ? (
          <p className={widgetStyles.emptyText}>No hay préstamos activos</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {loans.map((loan) => (
              <div
                key={loan.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 'var(--space-md)',
                  padding: 'var(--space-sm) 0',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                  <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {loan.funcionario.nombre}
                  </span>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                    Serie {loan.equipo.serie} — {loan.equipo.tipoEquipo.nombre}
                  </span>
                </div>
                <span style={{
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: urgencyColor(loan.diasTranscurridos),
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}>
                  {loan.diasTranscurridos === 0 ? 'Hoy' : `${loan.diasTranscurridos}d`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/dashboard/widgets/LoansAlertWidget.tsx
git commit -m "feat(dashboard): LoansAlertWidget con semáforo de días"
```

---

## Task 8: Frontend — RepairAlertWidget

**Files:**
- Create: `frontend/src/components/dashboard/widgets/RepairAlertWidget.tsx`

- [ ] **Step 1: Crear `RepairAlertWidget.tsx`**

```typescript
import { useNavigate } from 'react-router';
import { useRepairAlerts } from '../../../hooks/useDashboard';
import widgetStyles from './Widget.module.css';

function urgencyColor(dias: number): string {
  if (dias > 30) return 'var(--color-danger)';
  if (dias >= 14) return 'var(--color-warning)';
  return 'var(--color-success)';
}

export default function RepairAlertWidget() {
  const navigate = useNavigate();
  const { data: equipos, isLoading } = useRepairAlerts(5);

  return (
    <div className={widgetStyles.widget}>
      <div className={widgetStyles.widgetHeader}>
        <h3 className={widgetStyles.widgetTitle}>Equipos en reparación</h3>
        <button className={widgetStyles.widgetLink} onClick={() => navigate('/equipos?estado=EN_REPARACION')}>
          Ver todos →
        </button>
      </div>
      <div className={widgetStyles.widgetBody}>
        {isLoading ? (
          <p className={widgetStyles.loadingText}>Cargando...</p>
        ) : !equipos || equipos.length === 0 ? (
          <p className={widgetStyles.emptyText}>No hay equipos en reparación</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {equipos.map((eq) => (
              <div
                key={eq.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 'var(--space-md)',
                  padding: 'var(--space-sm) 0',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                  <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text)' }}>
                    Serie {eq.serie}
                  </span>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {eq.tipoEquipo.nombre}{eq.modelo ? ` — ${eq.modelo}` : ''}
                  </span>
                </div>
                <span style={{
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: urgencyColor(eq.diasEnReparacion),
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}>
                  {eq.diasEnReparacion === 0 ? 'Hoy' : `${eq.diasEnReparacion}d`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/dashboard/widgets/RepairAlertWidget.tsx
git commit -m "feat(dashboard): RepairAlertWidget con semáforo de días en reparación"
```

---

## Task 9: Frontend — EquipmentByTypeWidget

**Files:**
- Create: `frontend/src/components/dashboard/widgets/EquipmentByTypeWidget.tsx`

- [ ] **Step 1: Crear `EquipmentByTypeWidget.tsx`**

```typescript
import { useNavigate } from 'react-router';
import { useEquipmentByType } from '../../../hooks/useDashboard';
import widgetStyles from './Widget.module.css';

export default function EquipmentByTypeWidget() {
  const navigate = useNavigate();
  const { data: tipos, isLoading } = useEquipmentByType();

  const maxCount = tipos && tipos.length > 0 ? tipos[0].count : 1;

  return (
    <div className={widgetStyles.widget}>
      <div className={widgetStyles.widgetHeader}>
        <h3 className={widgetStyles.widgetTitle}>Por tipo de equipo</h3>
        <button className={widgetStyles.widgetLink} onClick={() => navigate('/equipos')}>
          Ver inventario →
        </button>
      </div>
      <div className={widgetStyles.widgetBody}>
        {isLoading ? (
          <p className={widgetStyles.loadingText}>Cargando...</p>
        ) : !tipos || tipos.length === 0 ? (
          <p className={widgetStyles.emptyText}>Sin datos</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {tipos.map((tipo) => (
              <div key={tipo.tipoNombre} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', fontWeight: 'var(--font-weight-medium)' }}>
                    {tipo.tipoNombre}
                  </span>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontWeight: 'var(--font-weight-semibold)' }}>
                    {tipo.count}
                  </span>
                </div>
                <div style={{ height: '6px', background: 'var(--color-bg)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${(tipo.count / maxCount) * 100}%`,
                    background: 'var(--color-primary)',
                    borderRadius: 'var(--radius-full)',
                    transition: 'width 0.4s ease',
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/dashboard/widgets/EquipmentByTypeWidget.tsx
git commit -m "feat(dashboard): EquipmentByTypeWidget con barras CSS proporcionales"
```

---

## Task 10: Frontend — ActivityFeedWidget con filtro

**Files:**
- Create: `frontend/src/components/dashboard/widgets/ActivityFeedWidget.tsx`

- [ ] **Step 1: Crear `ActivityFeedWidget.tsx`**

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useRecentActivity } from '../../../hooks/useDashboard';
import { ACCION_LABEL, ACCION_COLOR, ACCION_OPTIONS } from '../../../lib/action-types';
import widgetStyles from './Widget.module.css';
import styles from './ActivityFeedWidget.module.css';

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'ahora';
  if (diffMins < 60) return `hace ${diffMins}m`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays === 1) return 'ayer';
  if (diffDays < 7) return `hace ${diffDays} días`;
  return date.toLocaleDateString('es-UY', { day: '2-digit', month: 'short' });
}

export default function ActivityFeedWidget() {
  const navigate = useNavigate();
  const [accionFilter, setAccionFilter] = useState<string>('');
  const { data: activity, isLoading } = useRecentActivity(20, accionFilter || undefined);

  return (
    <div className={widgetStyles.widget}>
      <div className={widgetStyles.widgetHeader}>
        <h3 className={widgetStyles.widgetTitle}>Actividad Reciente</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <select
            value={accionFilter}
            onChange={(e) => setAccionFilter(e.target.value)}
            style={{
              fontSize: 'var(--font-size-xs)',
              padding: '3px var(--space-sm)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              cursor: 'pointer',
            }}
          >
            <option value="">Todas las acciones</option>
            {ACCION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button className={widgetStyles.widgetLink} onClick={() => navigate('/historial')}>
            Ver todo →
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className={widgetStyles.loadingText}>Cargando...</p>
      ) : activity && activity.length > 0 ? (
        <div className={styles.activityList}>
          {activity.map((item) => (
            <div
              key={item.id}
              className={styles.activityItem}
              data-clickable={Boolean(item.equipo)}
              onClick={() => item.equipo && navigate(`/equipos/${item.equipo.id}`)}
            >
              <span
                className={styles.accionBadge}
                data-color={ACCION_COLOR[item.accion] || 'neutral'}
              >
                {ACCION_LABEL[item.accion] || item.accion}
              </span>

              <div className={styles.activityInfo}>
                {item.equipo ? (
                  <span className={styles.activityEquipo}>
                    Serie {item.equipo.serie}
                    {item.equipo.modelo && <span className={styles.activityModelo}> — {item.equipo.modelo}</span>}
                    <span className={styles.activityTipo}>{item.equipo.tipoEquipo.nombre}</span>
                  </span>
                ) : (
                  <span className={styles.activityEquipo}>—</span>
                )}
                <span className={styles.activityMotivo}>{item.motivo}</span>
                {(item.oficinaOrigen || item.oficinaDestino) && (
                  <span className={styles.activityUbic}>
                    {item.oficinaOrigen && <span>{item.oficinaOrigen.nombre}</span>}
                    {item.oficinaOrigen && item.oficinaDestino && <span className={styles.arrow}>→</span>}
                    {item.oficinaDestino && <span>{item.oficinaDestino.nombre}</span>}
                  </span>
                )}
              </div>

              <div className={styles.activityMeta}>
                <span className={styles.activityUser}>{item.usuario.nombre}</span>
                <span className={styles.activityTime}>{formatTime(item.fecha)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className={widgetStyles.emptyText}>No hay actividad reciente</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Crear `ActivityFeedWidget.module.css`** (mover estilos desde `DashboardPage.module.css`):

```css
.activityList {
  display: flex;
  flex-direction: column;
}

.activityItem {
  display: grid;
  grid-template-columns: 140px 1fr auto;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-xl);
  border-bottom: 1px solid var(--color-border);
  transition: background var(--transition-fast);

  &:last-child { border-bottom: none; }

  &[data-clickable="true"] {
    cursor: pointer;
    &:hover { background: var(--color-bg); }
  }
}

.accionBadge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 3px var(--space-sm);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
  text-align: center;

  &[data-color="success"]  { background: var(--color-success-light); color: var(--color-success); }
  &[data-color="warning"]  { background: var(--color-warning-light); color: var(--color-warning); }
  &[data-color="danger"]   { background: var(--color-danger-light);  color: var(--color-danger);  }
  &[data-color="info"]     { background: var(--color-info-light);    color: var(--color-info);    }
  &[data-color="primary"]  { background: var(--color-primary-light); color: var(--color-primary-dark); }
  &[data-color="neutral"]  { background: var(--color-bg-subtle);     color: var(--color-text-secondary); }
}

.activityInfo {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.activityEquipo {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-secondary);
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  flex-wrap: wrap;
}

.activityModelo {
  font-weight: var(--font-weight-normal);
  color: var(--color-text-secondary);
}

.activityTipo {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 0 5px;
  font-weight: var(--font-weight-normal);
}

.activityMotivo {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.activityUbic {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  flex-wrap: wrap;
}

.arrow {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
}

.activityMeta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
}

.activityUser {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text);
  white-space: nowrap;
}

.activityTime {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  white-space: nowrap;
}

@media (width < 600px) {
  .activityItem {
    grid-template-columns: 1fr;
    gap: var(--space-xs);
  }
  .activityMeta {
    align-items: flex-start;
    flex-direction: row;
    gap: var(--space-sm);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/dashboard/widgets/ActivityFeedWidget.tsx frontend/src/components/dashboard/widgets/ActivityFeedWidget.module.css
git commit -m "feat(dashboard): ActivityFeedWidget con filtro por tipo de acción"
```

---

## Task 11: Frontend — DashboardGrid con DnD

**Files:**
- Create: `frontend/src/components/dashboard/DashboardGrid.tsx`
- Create: `frontend/src/components/dashboard/DashboardGrid.module.css`

- [ ] **Step 1: Crear `DashboardGrid.module.css`**

```css
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-lg);
}

/* Activity feed siempre ocupa todo el ancho */
.fullWidth {
  grid-column: 1 / -1;
}

@media (width < 900px) {
  .grid { grid-template-columns: 1fr; }
  .fullWidth { grid-column: auto; }
}
```

- [ ] **Step 2: Crear `DashboardGrid.tsx`**

```typescript
import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

import QuickActionsWidget from './widgets/QuickActionsWidget';
import LoansAlertWidget from './widgets/LoansAlertWidget';
import RepairAlertWidget from './widgets/RepairAlertWidget';
import EquipmentByTypeWidget from './widgets/EquipmentByTypeWidget';
import ActivityFeedWidget from './widgets/ActivityFeedWidget';
import widgetStyles from './widgets/Widget.module.css';
import styles from './DashboardGrid.module.css';

const LAYOUT_KEY = 'dashboard_layout';

const DEFAULT_ORDER = [
  'quick-actions',
  'loans-alert',
  'repair-alert',
  'equipment-by-type',
  'activity-feed',
];

const FULL_WIDTH_WIDGETS = new Set(['activity-feed']);

function loadOrder(): string[] {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (!raw) return DEFAULT_ORDER;
    const parsed = JSON.parse(raw) as string[];
    // Validar que contiene todos los widgets esperados (por si se agregaron nuevos)
    const hasAll = DEFAULT_ORDER.every((id) => parsed.includes(id));
    return hasAll ? parsed : DEFAULT_ORDER;
  } catch {
    return DEFAULT_ORDER;
  }
}

function WidgetContent({ id }: { id: string }) {
  switch (id) {
    case 'quick-actions':    return <QuickActionsWidget />;
    case 'loans-alert':      return <LoansAlertWidget />;
    case 'repair-alert':     return <RepairAlertWidget />;
    case 'equipment-by-type': return <EquipmentByTypeWidget />;
    case 'activity-feed':    return <ActivityFeedWidget />;
    default:                 return null;
  }
}

function SortableWidget({ id }: { id: string }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isFullWidth = FULL_WIDTH_WIDGETS.has(id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isFullWidth ? styles.fullWidth : undefined}
      {...attributes}
    >
      <div style={{ position: 'relative' }} className={isDragging ? widgetStyles.widgetDragging : undefined}>
        {/* Drag handle superpuesto en esquina superior derecha */}
        <div
          ref={setActivatorNodeRef}
          {...listeners}
          className={widgetStyles.dragHandle}
          style={{
            position: 'absolute',
            top: 'var(--space-md)',
            right: 'var(--space-md)',
            zIndex: 1,
          }}
          title="Arrastrar widget"
        >
          <GripVertical size={14} />
        </div>
        <WidgetContent id={id} />
      </div>
    </div>
  );
}

export default function DashboardGrid() {
  const [order, setOrder] = useState<string[]>(loadOrder);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setOrder((prev) => {
      const oldIndex = prev.indexOf(active.id as string);
      const newIndex = prev.indexOf(over.id as string);
      const next = arrayMove(prev, oldIndex, newIndex);
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={order} strategy={rectSortingStrategy}>
        <div className={styles.grid}>
          {order.map((id) => (
            <SortableWidget key={id} id={id} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/dashboard/DashboardGrid.tsx frontend/src/components/dashboard/DashboardGrid.module.css
git commit -m "feat(dashboard): DashboardGrid con drag-and-drop y persistencia en localStorage"
```

---

## Task 12: Frontend — refactorizar DashboardPage

**Files:**
- Modify: `frontend/src/pages/DashboardPage.tsx`
- Modify: `frontend/src/pages/DashboardPage.module.css`

- [ ] **Step 1: Reemplazar `DashboardPage.tsx` completo**

```typescript
import { useAuth } from '../lib/auth-context';
import { useDashboardStats } from '../hooks/useDashboard';
import StatsRow from '../components/dashboard/widgets/StatsRow';
import DashboardGrid from '../components/dashboard/DashboardGrid';
import styles from './DashboardPage.module.css';
import { usePageTitle } from '../hooks/usePageTitle';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function formatDate() {
  return new Date().toLocaleDateString('es-UY', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function DashboardPage() {
  usePageTitle('Dashboard');
  const { user } = useAuth();
  const { data: stats, isLoading: loadingStats } = useDashboardStats();

  const firstName = user?.nombre?.split(' ')[0] ?? '';

  return (
    <div className={styles.dashboard}>
      <div className={styles.welcome}>
        <div>
          <h2>{getGreeting()}, {firstName}</h2>
          <p>{formatDate()}</p>
        </div>
        <span className={styles.totalBadge}>
          {loadingStats ? '—' : stats?.totalEquipos ?? 0} equipos registrados
        </span>
      </div>

      <StatsRow stats={stats} loading={loadingStats} />
      <DashboardGrid />
    </div>
  );
}
```

- [ ] **Step 2: Reemplazar `DashboardPage.module.css` — solo bienvenida**

Toda la sección de stat cards y actividad se mueve a sus propios módulos CSS. El archivo queda solo con los estilos de la página:

```css
.dashboard {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

/* ─── Bienvenida ─── */
.welcome {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-lg);
  flex-wrap: wrap;

  & h2 {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-secondary);
    margin-bottom: var(--space-xs);
    text-transform: capitalize;
  }

  & p {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    text-transform: capitalize;
  }
}

.totalBadge {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  padding: var(--space-xs) var(--space-md);
  white-space: nowrap;
  flex-shrink: 0;
}
```

- [ ] **Step 3: Verificar que el frontend compila sin errores TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

Expected: sin output (0 errores)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/DashboardPage.tsx frontend/src/pages/DashboardPage.module.css
git commit -m "refactor(dashboard): simplificar DashboardPage — delega a StatsRow y DashboardGrid"
```

---

## Task 13: Verificación final

- [ ] **Step 1: Levantar el entorno y verificar que el dashboard carga**

```bash
npm run dev
```

Abrir `http://localhost:5173` y verificar:
- Las 6 tarjetas de stats muestran valores (no `—` permanente)
- Los 4 widgets aparecen en grilla de 2 columnas
- ActivityFeed aparece full-width debajo
- No hay errores en consola del browser

- [ ] **Step 2: Verificar drag & drop**

1. Arrastrar un widget a otra posición
2. La grilla se reorganiza visualmente
3. Recargar la página — el orden nuevo persiste
4. Abrir DevTools → Application → Local Storage → buscar `dashboard_layout`

- [ ] **Step 3: Verificar filtro de actividad**

1. Abrir el select "Todas las acciones" en el widget de actividad
2. Seleccionar "Transferencia"
3. La lista se actualiza mostrando solo transferencias

- [ ] **Step 4: Correr tests**

```bash
npm test
```

Expected: 40 tests passing

- [ ] **Step 5: Verificar build**

```bash
npm run build
```

Expected: sin errores TypeScript ni de Vite

- [ ] **Step 6: Commit final**

```bash
git add .
git commit -m "feat: dashboard upgrade fase 1 — widgets DnD, alertas, stats ampliadas, filtro actividad"
```
