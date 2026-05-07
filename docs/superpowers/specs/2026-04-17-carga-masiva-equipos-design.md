# Carga Masiva de Equipos

**Fecha:** 2026-04-17  
**Estado:** Aprobado

## Contexto

Cuando se realiza una compra de múltiples equipos del mismo modelo (ej: 10 routers iguales), el flujo actual obliga a cargar cada equipo de forma individual. Esto es tedioso y propenso a errores. Se necesita un flujo de carga masiva que permita definir los campos compartidos una sola vez y generar múltiples equipos con numeración correlativa, con la posibilidad de ajustar serie y campos por-equipo.

## Decisiones de diseño

- **Punto de entrada:** Botón "+ Carga masiva" en `EquipmentListPage`, junto al botón existente "+ Nuevo equipo"
- **Ruta:** `/equipos/lote` — página nueva, lazy-loaded
- **Numeración:** Arranca siempre desde `max(serie) + 1`, igual que el formulario individual. Se ingresa cantidad y se generan filas con series correlativas editables
- **Campos compartidos:** Todos los del formulario individual excepto serie, matrícula, MAC e IP (que son por-equipo)
- **Campos por fila:** `serie` (requerido, editable), `matricula`, `mac`, `ip` (todos opcionales)
- **Errores:** Si alguna serie es inválida o duplicada, se detiene todo — no se crea ningún equipo. Se muestran los errores en la fila correspondiente
- **Backend:** N requests `POST /equipment` individuales sin cambios en el backend. Validación existente se reutiliza íntegra

## Arquitectura

### Frontend

**Nueva página:** `frontend/src/pages/BulkEquipmentPage.tsx`  
Registrada en `App.tsx` con `React.lazy`.

**Ruta nueva en `App.tsx`:** `<Route path="/equipos/lote" element={<BulkEquipmentPage />} />`

**Botón en `EquipmentListPage.tsx`:** Segundo botón junto a "+ Nuevo equipo" que navega a `/equipos/lote`.

**Estructura de la página:**

1. **Sección "Datos compartidos"** — mismos campos que `EquipmentFormPage` excepto serie/matrícula/MAC/IP:
   - `tipoEquipoId` (requerido)
   - `templateId` (opcional, filtrado por tipo)
   - `modelo` (opcional)
   - Cascade `ciudadId → seccionId → oficinaId` via `LocationCascadeSelect` (requerido)
   - `proveedor`, `fechaAdquisicion`, `garantiaHasta`, `fechaFinVida`, `precioCompra`, `observacion` (todos opcionales)

2. **Sección "Equipos a crear"** — generador + tabla:
   - Input numérico "Cantidad" + botón "Generar filas" → crea N filas con series `maxSerie+1..maxSerie+N`
   - Tabla con columnas: `#`, `Serie *`, `Matrícula`, `MAC`, `IP`, `✕`
   - Cada fila es editable; botón ✕ elimina la fila
   - Validación en tiempo real de series duplicadas entre filas (dentro del lote)

3. **Botón "Crear N equipos"** — dispara la creación secuencial

### Flujo de envío

```
Para cada fila (en orden):
  POST /api/v1/equipment con campos compartidos + campos de la fila
  Si 409 (serie duplicada) → marcar fila con error, abortar todo
  Si otro error → marcar fila, abortar todo

Si todos OK → invalidar ['equipment'] y ['dashboard'] → navegar a /equipos
```

Los requests se envían en secuencia (no en paralelo) para poder reportar exactamente qué fila falló.

### Hooks reutilizados

- `useNextSerie()` — `frontend/src/hooks/useEquipment.ts:186` — obtiene max serie + 1
- `useTemplates(tipoEquipoId)` — `frontend/src/hooks/useEquipment.ts:196`
- `useCreateEquipment()` — `frontend/src/hooks/useEquipment.ts` — mutación existente
- `LocationCascadeSelect` — `frontend/src/components/LocationCascadeSelect.tsx`

### Estado del componente

```ts
// Campos compartidos
shared: SharedFields

// Filas de equipos
rows: Array<{ id: string; serie: number; matricula: string; mac: string; ip: string; error?: string }>

// Estado de envío
isSubmitting: boolean
submitError: string | null
```

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `frontend/src/App.tsx` | Agregar lazy import y ruta `/equipos/lote` |
| `frontend/src/pages/EquipmentListPage.tsx` | Agregar botón "+ Carga masiva" |
| `frontend/src/pages/BulkEquipmentPage.tsx` | **Crear** — página nueva |
| `frontend/src/pages/BulkEquipmentPage.module.css` | **Crear** — estilos de la página |

## Verificación

1. Navegar a `/equipos` → verificar que aparece botón "+ Carga masiva"
2. Click en botón → navegar a `/equipos/lote`
3. Completar datos compartidos (tipo, ubicación requeridos)
4. Ingresar cantidad 3 → "Generar filas" → verificar series desde max+1
5. Editar una serie manualmente → verificar que se respeta
6. Eliminar una fila con ✕ → verificar que se remueve
7. Submit válido → verificar que se crean N equipos en DB y redirige a listado
8. Submit con serie duplicada → verificar que NO se crea ningún equipo y aparece error en la fila
9. Verificar que `['equipment']` y `['dashboard']` se invalidan correctamente
