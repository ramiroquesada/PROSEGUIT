# Dashboard Upgrade — Design Spec
**Date:** 2026-03-30
**Status:** Approved

---

## Context

El dashboard actual muestra 4 tarjetas de stats fijas y un feed de actividad reciente (últimas 20 acciones). Con el inventario creciendo y el equipo usando el sistema diariamente, se necesita más visibilidad sobre el estado del inventario, alertas tempranas de situaciones que requieren atención (préstamos viejos, equipos en reparación prolongada), y acceso rápido a las acciones más frecuentes.

La mejora transforma el dashboard en un panel modular con widgets reorganizables por el usuario.

---

## Objetivo

- Ampliar las estadísticas visibles (6 estados del inventario vs 4 actuales)
- Agregar widgets de alerta para préstamos sin devolver y equipos mucho tiempo en reparación
- Agregar panel de acciones rápidas
- Agregar desglose del inventario por tipo de equipo
- Agregar gráficos de actividad (30 días) y top ubicaciones con Recharts
- Hacer el layout reorganizable (drag-and-drop) con persistencia en localStorage
- Filtro en la actividad reciente por tipo de acción

---

## Decisiones de diseño

| Decisión | Elección | Razón |
|----------|----------|-------|
| Layout | Grid de widgets (opción C) | Mejor uso del espacio, cada widget ocupa lo que necesita |
| Reorganización | Drag-and-drop con `@dnd-kit/sortable` | Librería moderna, bien mantenida, compatible con React 19 |
| Persistencia del layout | `localStorage` key `dashboard_layout` | Simple, sin carga al servidor, suficiente para el caso de uso |
| Gráficos | Recharts | Integración nativa React, ligero, soporte hover/tooltip |
| Fases | 2 fases | Fase 1 sin Recharts entrega valor inmediato; Fase 2 agrega gráficos |

---

## Arquitectura

### Layout general

```
┌─────────────────────────────────────────────────────────┐
│  STATS ROW (siempre fija, no draggable)                 │
│  [Activos] [Reparación] [Depósito] [Nuevos] [Préstamos] [Ubic.] │
├─────────────────────────────────────────────────────────┤
│  WIDGET GRID (draggable, 2 columnas desktop)            │
│  ┌──────────────┐  ┌──────────────┐                     │
│  │ Acciones     │  │ Préstamos    │                     │
│  │ Rápidas      │  │ sin devolver │                     │
│  ├──────────────┤  ├──────────────┤                     │
│  │ En reparación│  │ Tipos de     │                     │
│  │ hace mucho   │  │ equipo       │                     │
│  └──────────────┘  └──────────────┘                     │
│  ┌──────────────────────────────────┐                   │
│  │ Actividad Reciente (full width)  │ [Filtro ▾]        │
│  └──────────────────────────────────┘                   │
│  [Fase 2] ┌──────────────┐  ┌──────────────┐            │
│           │ Actividad    │  │ Top          │            │
│           │ 30 días      │  │ Ubicaciones  │            │
│           └──────────────┘  └──────────────┘            │
└─────────────────────────────────────────────────────────┘
```

### Estructura de archivos nueva

```
frontend/src/
├── components/dashboard/
│   ├── DashboardGrid.tsx            ← contenedor DnD con @dnd-kit/sortable
│   ├── DashboardGrid.module.css
│   └── widgets/
│       ├── StatsRow.tsx             ← 6 tarjetas fijas (no draggable)
│       ├── StatsRow.module.css
│       ├── QuickActionsWidget.tsx
│       ├── LoansAlertWidget.tsx
│       ├── RepairAlertWidget.tsx
│       ├── EquipmentByTypeWidget.tsx
│       ├── ActivityFeedWidget.tsx   ← refactor del bloque actual + filtro
│       ├── ActivityChartWidget.tsx  ← Fase 2
│       ├── TopLocationsWidget.tsx   ← Fase 2
│       └── Widget.module.css        ← estilos base compartidos (header, drag handle)
├── hooks/
│   └── useDashboard.ts              ← agregar hooks nuevos
└── pages/
    └── DashboardPage.tsx            ← simplificado, delega a DashboardGrid
```

### Persistencia del layout

```typescript
// localStorage key
const LAYOUT_KEY = 'dashboard_layout';

// Valor: array de widget IDs en el orden actual
// Ejemplo: ['quick-actions', 'loans-alert', 'repair-alert', 'equipment-by-type', 'activity-feed']

// Orden por defecto (si no hay nada en localStorage)
const DEFAULT_ORDER = [
  'quick-actions',
  'loans-alert',
  'repair-alert',
  'equipment-by-type',
  'activity-feed',
  // Fase 2:
  // 'activity-chart',
  // 'top-locations',
];
```

---

## Backend

### Cambios en endpoints existentes

**`GET /dashboard/stats`** — extender respuesta:
```typescript
// Agregar a la respuesta existente:
enServicioExterno: number;   // equipos con estado EN_SERVICIO_EXTERNO
equiposNuevos: number;       // ya calculado en service, solo exponerlo
```

### Nuevos endpoints — Fase 1

**`GET /dashboard/loans-alerts?limit=5`**
```typescript
// Respuesta: préstamos activos (fechaDevolucion IS NULL) ordenados por fechaPrestamo ASC
[{
  id: number;
  fechaPrestamo: string;      // ISO date
  diasTranscurridos: number;  // calculado en backend
  equipo: { serie: number; modelo: string | null; tipoEquipo: { nombre: string } };
  funcionario: { nombre: string };
}]
```

**`GET /dashboard/repair-alerts?limit=5`**
```typescript
// Equipos EN_REPARACION, ordenados por fecha de último ENVIO_SOPORTE ASC
// (el equipo que lleva más tiempo en reparación va primero)
[{
  id: number;
  serie: number;
  modelo: string | null;
  tipoEquipo: { nombre: string };
  diasEnReparacion: number;   // días desde el último ENVIO_SOPORTE
  fechaIngreso: string;       // fecha del ENVIO_SOPORTE
}]
```

**`GET /dashboard/equipment-by-type`**
```typescript
// Count de equipos agrupado por tipo, ordenado por count DESC
[{
  tipoNombre: string;
  count: number;
}]
```

### Nuevos endpoints — Fase 2

**`GET /dashboard/activity-chart`**
```typescript
// Conteo de acciones del Historial por día, últimos 30 días
// Días sin actividad se incluyen con count: 0
[{
  date: string;   // "2026-03-01"
  count: number;
}]
// 30 items siempre
```

**`GET /dashboard/top-locations?limit=8`**
```typescript
// Oficinas con más equipos asignados (excluye soporte/depósito)
[{
  oficinaId: number;
  oficinaNombre: string;
  seccionNombre: string;
  count: number;
}]
```

---

## Frontend — Widgets en detalle

### DashboardGrid
- Usa `@dnd-kit/core` + `@dnd-kit/sortable`
- Lee el orden inicial desde `localStorage` (fallback a `DEFAULT_ORDER`)
- Al soltar un widget (`onDragEnd`), guarda el nuevo orden en `localStorage`
- Renderiza widgets en el orden del array de IDs
- Los widgets se renderizan en grilla CSS de 2 columnas; `activity-feed` ocupa full width (siempre)

### StatsRow
- Siempre arriba, no participa en el DnD
- 6 tarjetas: Activos (verde), En Reparación (amarillo), En Depósito (gris), Nuevos (índigo), Préstamos Activos (azul), Ubicaciones (neutro)
- Cada tarjeta clickeable navega al filtro correspondiente (igual que hoy las 4 existentes)

### QuickActionsWidget
- 3 botones: "Nuevo equipo" → `/equipos/nuevo`, "Registrar préstamo" → `/prestamos`, "Ver reparaciones" → `/equipos?estado=EN_REPARACION`
- Solo visible para ADMIN y TECNICO (todos los roles en este sistema)

### LoansAlertWidget
- Hook `useLoansAlerts(limit=5)` → `GET /dashboard/loans-alerts`
- Muestra lista con nombre del funcionario y días transcurridos
- Color: verde < 14 días, amarillo 14-30, rojo > 30 días
- Link "Ver todos" → `/prestamos`

### RepairAlertWidget
- Hook `useRepairAlerts(limit=5)` → `GET /dashboard/repair-alerts`
- Muestra equipo (serie + tipo) y días en reparación
- Misma lógica de color que préstamos
- Link "Ver todos" → `/equipos?estado=EN_REPARACION`

### EquipmentByTypeWidget
- Hook `useEquipmentByType()` → `GET /dashboard/equipment-by-type`
- Lista con barra CSS proporcional al máximo. No usa Recharts.
- Muestra top 8 tipos. Link "Ver inventario" → `/equipos`

### ActivityFeedWidget
- Refactor del bloque actual en `DashboardPage.tsx` → widget independiente
- Agrega dropdown de filtro por tipo de acción (ACCION_OPTIONS de `action-types.ts`)
- Al cambiar filtro, hace fetch nuevo — se extiende `GET /dashboard/recent-activity` con query param `?accion=TRANSFERENCIA` etc.
- El backend filtra en el `where` de Prisma antes de devolver los resultados

### ActivityChartWidget (Fase 2)
- Hook `useActivityChart()` → `GET /dashboard/activity-chart`
- Recharts `BarChart` con barras por día, color primario `#00A79D`
- Tooltip muestra fecha y cantidad de acciones
- Sin eje Y explícito para mantener limpieza visual

### TopLocationsWidget (Fase 2)
- Hook `useTopLocations(limit=8)` → `GET /dashboard/top-locations`
- Recharts `BarChart` horizontal con nombre de oficina en eje Y
- Color `#003366`

---

## Dependencias nuevas

```bash
# Fase 1
cd frontend && npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Fase 2
cd frontend && npm install recharts
```

---

## Verificación

### Fase 1
1. `npm run dev` — dashboard carga sin errores
2. Las 6 tarjetas de stats muestran valores correctos
3. Widgets de alerta muestran datos reales (o estado vacío si no hay)
4. Drag & drop reorganiza widgets visualmente
5. Recargar la página preserva el orden arrastrado
6. Filtro en actividad reciente filtra correctamente
7. `npm test` — 40 tests siguen pasando

### Fase 2
1. Gráfico de actividad muestra 30 días con barras
2. Hover en barras muestra tooltip con fecha y count
3. Top ubicaciones muestra barras horizontales
4. Widgets de Fase 2 se integran al grid DnD igual que los otros
5. `npm run build` — sin errores TypeScript
