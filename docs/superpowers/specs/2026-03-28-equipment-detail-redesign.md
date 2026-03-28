# Spec: Rediseño Visual — Ficha de Equipo

**Fecha:** 2026-03-28
**Página:** `EquipmentDetailPage` (`/equipos/:id`)
**Objetivo:** Mejorar el aspecto visual general para que se vea más profesional y moderna, manteniendo toda la funcionalidad existente.

---

## Decisiones de diseño

| Pregunta | Decisión |
|----------|----------|
| Dirección visual | Bento Grid Modular (C) |
| Layout del cuerpo | Columna fluida única (C) |
| Estilo del historial | Timeline con línea vertical y puntos de colores (A) |
| Estructura general | Hero + Fila Bento + Columna (Opción 1) |

---

## Estructura de la página

### 1. Hero (gradiente navy → teal)

- **Fondo:** `linear-gradient(135deg, #002244, #003366, #004455, #005550)`
- **Decoración:** dos círculos translúcidos de fondo (top-right y bottom-left) para profundidad
- **Contenido:**
  - Botón "← Volver a equipos" (borde semitransparente, texto blanco apagado)
  - Ícono del equipo (cuadrado redondeado, fondo rgba blanco)
  - Número de serie en tipografía grande (28px, 800 weight, blanco)
  - Subtítulo: tipo · marca modelo (texto blanco 55% opacidad)
  - Ubicación actual con dot teal (Ciudad · Sección · Oficina)
  - Badge de estado en esquina derecha (colores según estado: success/warning/danger/info/neutral)
  - Botón "Editar" en teal con sombra

### 2. Fila Bento (4 celdas)

Barra horizontal blanca debajo del hero, con 4 celdas separadas por bordes:

| Celda | Ícono | Valor | Sub |
|-------|-------|-------|-----|
| Ubicación actual | 📍 | Nombre de oficina | Sección · Ciudad |
| Última acción | 📋 | Tipo de acción (coloreado) | "hace X días" |
| Préstamos | 🔄 | "N activos" | "N históricos" |
| Historial | 🛠 | "N acciones" | "desde YYYY" |

- La celda "Ubicación" tiene fondo `#f0fafa` (highlight teal sutil)
- El valor de "Última acción" se colorea según el tipo (info/success/warning/etc.)

### 3. Cuerpo — columna fluida

Padding `16px 24px`. Tres cards apiladas verticalmente con `gap: 12px`.

#### Card 1 — Información del equipo

- Header: barra teal 3px + título "Información del equipo"
- Body: grid 2 columnas de pares label/valor
- Labels en mayúsculas, 9px, color tertiary
- Valores en 12px, weight 500
- Campo serie en fuente monoespaciada

#### Card 2 — Acciones

- Header: barra navy 3px + título "Acciones"
- Body: grid 2×2 de botones de acción
- Cada botón tiene: ícono (26×26, fondo sutil), nombre + descripción corta
- Variantes de color por acción:
  - **Transferir (SALIDA):** teal claro (`#e6f7f6`, borde teal)
  - **Enviar a Soporte:** amarillo (`#fef3c7`, borde amber)
  - **Servicio Externo:** gris (`#f1f5f9`, borde slate)
  - **Dar de Baja:** rojo (`#fee2e2`, borde red)
- Los botones que no aplican al estado actual del equipo se ocultan (comportamiento existente)

#### Card 3 — Historial de acciones

- Header: barra info-blue 3px + título "Historial de acciones (N)"
- Body: timeline vertical
  - Línea vertical `#e2e8f0` entre dots
  - Dot: 14px, borde coloreado según acción, fondo blanco
  - Por evento: tipo de acción (coloreado, bold), fecha (derecha, gris), motivo, ubicación origen→destino, técnico (italic)
  - Sin cambios estructurales respecto al actual, mejora visual únicamente

---

## Archivos a modificar

- `frontend/src/pages/EquipmentDetailPage.module.css` — reescritura completa de estilos
- `frontend/src/pages/EquipmentDetailPage.tsx` — cambios de estructura HTML:
  - Reemplazar header actual por bloque `.hero`
  - Agregar fila `.bentoRow` entre el hero y el cuerpo; los datos provienen de: `equipo.oficina` (ubicación), `historial[0]` (última acción + fecha), `prestamos.filter(activo)` (préstamos activos), `historial.length` (total acciones)
  - Cambiar layout de `.content` de 2 columnas a columna única
  - Reestructurar `.actionButtons` en grid 2×2 con descripción corta por botón

## Archivos a NO modificar

- Lógica de negocio (mutations, resolveEstado, etc.)
- Hooks (`useEquipment`, `useHistory`)
- Backend

---

## Tokens de diseño usados

Todos los colores, espaciados, radios y sombras usan las custom properties existentes de `variables.css`. Las únicas excepciones son los gradientes del hero (valores hardcodeados en el CSS de la página) y algunos colores de estado de equipo ya existentes en el CSS actual.

---

## Comportamiento preservado

- Badge de estado con colores (ACTIVO/EN_REPARACION/EN_DEPOSITO/PRESTADO/EN_SERVICIO_EXTERNO/NUEVO)
- Acciones condicionales según estado del equipo
- Avisos de estado especial (nuevoNotice, bajaNotice, prestamoNotice) — se mantienen como banners en la card de acciones
- Modal de acción (sin cambios de estilo)
- Timeline con todos los campos actuales
- Layout responsivo: en mobile el hero se compacta, la fila bento colapsa a 2×2, el grid de acciones a 1 columna
