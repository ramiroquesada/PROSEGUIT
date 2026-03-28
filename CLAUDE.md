# PROSEGUIT v2

Sistema de Gestión de Inventario IT — Intendencia de Soriano, Uruguay.
Reemplaza a "seguit v1" (PHP/MySQL). Desarrollado por el equipo de Informática.

---

## Stack

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Monorepo | npm workspaces | — |
| Backend | Express + TypeScript | 5.2 / 5.9 |
| ORM | Prisma + adapter pg | 7.5 |
| Base de datos | PostgreSQL (Docker) | 17 |
| Auth | JWT (access 15m + refresh 7d) + bcryptjs | — |
| Validación | Zod (compartido front/back via `@proseguit/shared`) | 4.3 |
| Frontend | React + TypeScript + Vite | 19.2 / 5.9 / 8.0 |
| Routing | React Router | 7.13 |
| Estado servidor | TanStack Query | 5.94 |
| UI | CSS Modules + nesting nativo + custom properties. **NO Tailwind** | — |
| Íconos | Lucide React | — |
| Dev | Docker Compose (PostgreSQL en puerto **5433**) | — |

**Colores institucionales:** Teal `#00A79D` (primario), Navy `#003366` (secundario)

---

## Estado actual del proyecto (Marzo 2026)

### ✅ Backend — 9 módulos completos

| Módulo | Endpoints principales |
|--------|----------------------|
| `auth` | POST login, refresh, logout |
| `equipment` | GET list/detail, POST crear, PUT editar, POST transfer/send-to-support/send-to-service/return-from-service |
| `locations` | GET tree, POST/PUT cities/sections/offices |
| `dashboard` | GET stats, GET recent-activity |
| `history` | GET list (paginado + filtros), GET by equipoId |
| `loans` | GET list, POST crear, POST return |
| `model-templates` | CRUD completo (admin only) |
| `service-providers` | CRUD completo (admin only) |
| `users` | CRUD + reset-password + change-password |

### ✅ Frontend — 11 páginas

| Ruta | Página | Descripción |
|------|--------|-------------|
| `/login` | LoginPage | Card centrada, gradiente navy, animación de entrada |
| `/cambiar-password` | ChangePasswordPage | Forzado en primer login |
| `/` | DashboardPage | Stats cards + actividad reciente clickeable |
| `/equipos` | EquipmentListPage | Tabla con búsqueda debounced, filtros en cascada, columnas ordenables, paginación con ventana de páginas |
| `/equipos/nuevo` | EquipmentFormPage | Formulario con plantillas de modelos |
| `/equipos/:id` | EquipmentDetailPage | Ficha + acciones + timeline de historial |
| `/equipos/:id/editar` | EquipmentFormPage | Edición |
| `/prestamos` | LoansPage | Lista + nuevo préstamo por serie |
| `/ubicaciones` | LocationsPage | Árbol Ciudad›Sección›Oficina + panel de equipos |
| `/historial` | HistoryPage | Historial global con filtros y badges |
| `/plantillas` | TemplatesPage | CRUD plantillas de modelos (admin) |
| `/usuarios` | UsersPage | CRUD usuarios (admin) |

### ✅ Características implementadas
- Auth completa con JWT access + refresh tokens
- Página de cambio de contraseña (`/cambiar-password`) — accesible voluntariamente; muestra banner si `forcePasswordChange` es true pero ya no redirige forzosamente
- Acciones de equipos: transferir (SALIDA), enviar a soporte (ENTRADA), enviar a servicio externo, dar de baja, retornar de servicio
- Historial completo de cada acción con motivo, ubicación origen/destino, técnico y fecha
- Préstamos: crear por número de serie, registrar devolución
- Árbol de ubicaciones de 3 niveles con CRUD
- Panel lateral en ubicaciones que muestra equipos de la oficina seleccionada
- Sidebar con íconos Lucide, gradiente navy, footer fijo con usuario
- Header sticky con nombre del usuario logueado y breadcrumb para subrutas
- Dashboard con saludo personalizado según hora del día
- Script de migración desde seguit v1 (`backend/prisma/migrate-v1.ts`)
- **Estado de equipo derivado del nombre de oficina** — no del campo DB (depósito/soporte = estado especial)
- **EquipmentListPage**: búsqueda debounced, filtros en cascada (ciudad→sección→oficina), chips de filtros activos, columnas ordenables (serie/tipo/modelo), paginación con ventana ±5, selector de página arriba y abajo, scroll preservado al paginar
- **Estado NUEVO**: equipo recién ingresado. Al crear un equipo queda en NUEVO (en soporte). Al transferirlo a cualquier oficina que no sea soporte/depósito se convierte automáticamente en ACTIVO. Ver sección "Flujo estado NUEVO" más abajo.
- **Formulario nuevo equipo**: pre-rellena el próximo número de serie (max+1), pre-selecciona tipo "PC - Torre" y la oficina de soporte como ubicación inicial
- **Dashboard en tiempo real**: todas las mutaciones de equipo invalidan `['dashboard']` via TanStack Query prefix matching, actualizando contadores y actividad reciente sin recargar la página

---

## Comandos

```bash
# Entorno de desarrollo
npm run dev              # Inicia backend (:3001) + frontend (:5173) simultáneamente
npm run db:up            # Levanta PostgreSQL en Docker (puerto 5433)
npm run db:down          # Detiene PostgreSQL
npm run db:migrate       # Prisma migrate dev (aplica cambios al schema)
npm run db:studio        # Abre Prisma Studio (explorador visual de BD)
npm run db:seed          # Seed: crea usuarios admin (9999) y técnico (7844)

# Migración de datos desde seguit v1 (ver sección completa abajo)
node extract_data.js                              # Genera export_datos_v1.json desde el .sql
cd backend && npx tsx prisma/migrate-v1.ts        # Importa todos los datos de v1

# Individual (si concurrently falla)
npm run dev:backend      # Solo backend
npm run dev:frontend     # Solo frontend
```

---

## Migración de datos desde seguit v1

**Cuándo hacer esto:** cuando se trae un dump SQL actualizado de seguit v1 con nuevos equipos.

### Prerrequisitos
- Docker Desktop corriendo
- `db_seguit1.sql` colocado en la **raíz del proyecto** (`c:\Users\ramir\Desktop\PROSEGIT\`)

### Pasos en orden

```bash
# 1. Extraer los datos del dump SQL a JSON
node extract_data.js
# → genera export_datos_v1.json (~1-2 MB) en la raíz del proyecto

# 2. Asegurarse de que la base de datos esté corriendo
npm run db:up

# 3. Correr el script de migración
cd backend && npx tsx prisma/migrate-v1.ts
```

### Qué hace el script de migración
1. **Limpia** los datos existentes (historial, préstamos, equipos, tipos, servicios, oficinas v1)
2. **Migra ubicaciones** — todas las ubicaciones de v1 se crean como Oficinas bajo `Mercedes > General`
3. **Migra tipos de equipo** — 35 tipos de v1
4. **Migra usuarios** — password temporal = ficha, forcePasswordChange = true (excepto admin 9999)
5. **Migra funcionarios** — para solicitantes de préstamos
6. **Migra servicios externos** — proveedores de reparación
7. **Migra equipos** — todos con estado ACTIVO por defecto
8. **Migra historial** — mapea texto libre de v1 a tipos de acción de v2: "propietario" → `ASIGNACION`, "se cambio la ubicacion" → `TRANSFERENCIA`, "se ingreso" → `RETORNO_SOPORTE`, "se envio a service" → `ENVIO_SERVICIO_EXTERNO`, "se creo" → `CREACION`
9. **Migra préstamos** — `fec_dev = '1900-01-01'` = préstamo activo

### Advertencias importantes
- ⚠️ El script **borra datos existentes** antes de migrar — no correr sobre datos de producción con cambios nuevos
- Los equipos con `serie` duplicada se omiten (skipped) sin error fatal
- Se puede volver a correr el script sin problema si falla a mitad (la limpieza inicial lo resetea)
- Los warns que aparecen en consola son normales — son registros de historial con datos incompletos

### Si el script tira errores
- `Cannot find module` → verificar que `export_datos_v1.json` existe en la raíz
- `Connection refused` → correr `npm run db:up` primero
- `P2002 Unique constraint` en tipos/ubicaciones → normal, son upserts, no es un error real
- `Error: invalid input syntax for type integer` → el dump tiene datos corruptos, son skipped automáticamente

---

## Convenciones de código

- **CSS**: Módulos CSS con nesting nativo y custom properties. NO Tailwind, NO styled-components
- **Ancho de páginas**: páginas de listado (tabla) = sin `max-width`, ocupan todo el ancho del `.content`. Páginas de formulario/detalle = `max-width` centrado (ej: 800px form, 1200px detail). Nunca poner `max-width` en páginas de listado.
- **Estado de equipo**: nunca leer el campo `estado` de DB para mostrar en UI (puede estar desactualizado). Siempre usar `resolveEstado(eq.estado, eq.oficina.nombre)` de `frontend/src/lib/equipment-status.ts`. El backend también filtra por nombre de oficina en `listEquipment`.
- **Ordenamiento en listado**: el backend acepta `sortBy` (`serie`|`modelo`|`tipo`) y `sortDir` (`asc`|`desc`) como query params. Al cambiar filtros se resetea el orden.
- **Íconos**: Lucide React (`import { Monitor, MapPin, ... } from 'lucide-react'`)
- **React 19**: usar `use(AuthContext)` en vez de `useContext()`, `<Context value={}>` sin `.Provider`
- **Prisma 7**: requiere adapter (`@prisma/adapter-pg`), config en `backend/prisma.config.ts`
- **Express 5**: async error handling nativo sin try/catch en controllers, nuevo path matching
- **API**: prefijo `/api/v1/`
- **Idioma UI**: Español (Uruguay) — "ficha", "técnico", "préstamo", "ubicación"
- **Mutaciones**: TanStack Query `useMutation` + `queryClient.invalidateQueries` al completar. Las mutaciones de equipos deben invalidar `['equipment']`, `['history', 'equipment', id]` **y** `['dashboard']`. Los hooks de dashboard usan claves `['dashboard', 'stats']` y `['dashboard', 'recent-activity', limit]` — el prefijo `['dashboard']` es suficiente para invalidar ambos.
- **SALIDA vs ENTRADA** (equipos):
  - ENTRADA = `POST /equipment/:id/send-to-support` → registra siempre `ENVIO_SOPORTE` (retorno temporal a Soporte para reparación, NO es traslado permanente).
  - SALIDA = `POST /equipment/:id/transfer` → el tipo de acción depende del `estado` actual del equipo:
    - `EN_REPARACION` → `RETORNO_SOPORTE` (estaba en soporte para reparación, ahora vuelve al usuario)
    - `NUEVO` o `EN_DEPOSITO` → `ASIGNACION` (primera asignación a destino final)
    - `ACTIVO` → `TRANSFERENCIA` (traslado entre oficinas)
  - Nunca hardcodear `TRANSFERENCIA` en `/transfer`; el backend decide según el estado.

---

## Flujo estado NUEVO

> Contexto: los equipos se compran y llegan físicamente a "Informatica - Soporte". Recién ahí se ingresan al sistema antes de distribuirse.

### Ciclo de vida

1. **Creación** — El equipo se registra con estado `NUEVO` en la oficina de soporte (pre-seleccionada automáticamente en el form). El número de serie se pre-rellena con `max(serie) + 1`.
2. **Asignación** — Cuando se decide el destino, se usa "Transferir" hacia la oficina final. El backend cambia automáticamente el estado a `ACTIVO` (o `EN_REPARACION`/`EN_DEPOSITO` si va a soporte/depósito).
3. **Sin destino inmediato** — El equipo puede quedarse en `NUEVO` todo el tiempo que sea necesario hasta que se asigne.

### Regla técnica (`resolveEstado`)

- `NUEVO`, `PRESTADO`, `EN_SERVICIO_EXTERNO` → se leen **directo de DB**, no se derivan del nombre de oficina
- `EN_REPARACION`, `EN_DEPOSITO`, `ACTIVO` → se derivan del nombre de oficina

### Migración DB

- `20260328173932_add_estado_nuevo` — agrega `NUEVO` al enum `estado_equipo`
- `20260328200000_add_asignacion_accion` — agrega `ASIGNACION` al enum `accion_tipo`
- Si se carga una nueva DB con datos de v1, **hay que aplicar ambas migraciones antes** de importar los datos
- Nota: estas migraciones usan `prisma db push` + resolve manual (no `migrate dev`) porque PostgreSQL no permite usar valores de enum nuevo en la misma transacción que los agrega

---

## Estructura clave

```
PROSEGIT/
├── CLAUDE.md                          # ← este archivo
├── README.md                          # Documentación pública
├── docker-compose.yml                 # PostgreSQL en puerto 5433
├── db_seguit1.sql                     # Dump SQL de seguit v1 (reemplazar con el nuevo)
├── export_datos_v1.json               # JSON generado por extract_data.js
├── extract_data.js                    # Parsea el .sql y genera el .json
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma              # ← Modelo de datos completo (12 modelos, 2 enums)
│   │   ├── seed.ts                    # Usuarios iniciales (admin 9999, técnico 7844)
│   │   ├── migrate-v1.ts              # Script migración datos de seguit v1
│   │   ├── migrations/20260322153214_init/  # Migración inicial (schema base)
│   │   ├── migrations/20260328173932_add_estado_nuevo/  # Agrega NUEVO al enum estado_equipo
│   │   └── migrations/20260328200000_add_asignacion_accion/  # Agrega ASIGNACION al enum accion_tipo
│   ├── prisma.config.ts               # Config Prisma 7 con adapter pg
│   └── src/
│       ├── index.ts                   # Punto de entrada Express
│       ├── config/                    # env.ts (JWT_SECRET, DB URL, PORT)
│       ├── middleware/                # auth.ts, validate.ts, error-handler.ts
│       └── modules/                   # Un directorio por dominio (ver tabla arriba)
│           └── {dominio}/
│               ├── {dominio}.routes.ts
│               ├── {dominio}.controller.ts
│               └── {dominio}.service.ts
│
├── frontend/
│   ├── vite.config.ts                 # Proxy /api → :3001
│   └── src/
│       ├── App.tsx                    # Router con ProtectedRoute + GuestRoute
│       ├── lib/
│       │   ├── api-client.ts          # Singleton con JWT auto-refresh
│       │   ├── auth-context.tsx       # AuthContext (React 19 use())
│       │   ├── equipment-status.ts    # resolveEstado(), STATUS_LABEL, STATUS_COLOR — derivar estado desde nombre de oficina
│       │   └── find-soporte-office.ts # Busca la oficina de Soporte en el árbol de ubicaciones
│       ├── hooks/                     # useEquipment, useLocations, useHistory, useLoans, useUsers, useDashboard
│       ├── components/layout/         # Sidebar.tsx, Header.tsx, MainLayout.tsx
│       ├── pages/                     # 11 páginas (ver tabla arriba)
│       └── styles/                    # variables.css, reset.css, globals.css
│
└── packages/shared/src/
    ├── types/                         # Tipos TypeScript compartidos
    ├── schemas/                       # Schemas Zod para validación
    └── constants/                     # Estados de equipo, roles, tipos de acción
```

---

## Modelos de datos (Prisma)

**Ubicaciones (3 niveles):** `Ciudad` → `Seccion` → `Oficina`

**Equipos:** `TipoEquipo` → `ModeloTemplate` → `Equipo` (estado: NUEVO | ACTIVO | EN_REPARACION | EN_DEPOSITO | PRESTADO | EN_SERVICIO_EXTERNO)

**Acciones:** `Historial` (accion: CREACION | ASIGNACION | EDICION | TRANSFERENCIA | ENVIO_SOPORTE | RETORNO_SOPORTE | PRESTAMO | DEVOLUCION | CAMBIO_ESTADO | ENVIO_SERVICIO_EXTERNO | RETORNO_SERVICIO_EXTERNO)

**Otros:** `Prestamo`, `EnvioServicio`, `ServicioExterno`, `Usuario` (rol: ADMIN | TECNICO), `Funcionario`, `RefreshToken`

---

## Usuarios

| Ficha | Contraseña | Rol | Notas |
|-------|-----------|-----|-------|
| `9999` | `admin123` | ADMIN | Usuario administrador |
| `7844` | `7844` | TECNICO | Ramiro Quesada |


---

## Problemas conocidos (Windows)

### Proceso Node no muere al detener
Los procesos de Node iniciados desde bash en VSCode a veces quedan corriendo como procesos huérfanos.
Si el backend no refleja cambios:
```bash
# Ver qué tiene el puerto 3001
netstat -ano | findstr :3001
# El PID aparece al final → matar desde Task Manager o reiniciar VSCode
```
**Solución definitiva:** reiniciar VSCode (o la PC si VSCode tampoco mata los procesos).

### Git push falla con "behind remote"
El hook `.githooks/pre-push` verifica que el repo local esté actualizado antes de pushear.
Si falla: `git pull origin main` primero.

---

## Mantener sincronizados los agentes y skills

Cuando hagas cambios en estas áreas, actualizá también el archivo correspondiente:

| Si cambiás... | Actualizá... |
|---------------|-------------|
| CSS variables (`frontend/src/styles/variables.css`) | `.claude/agents/css-designer.md` |
| Endpoints del backend (rutas nuevas o eliminadas) | `.claude/agents/api-tester.md` |
| Proceso de migración de datos | `.claude/agents/migration-helper.md` |
| Comandos de desarrollo o puertos | `.claude/skills/dev-setup/SKILL.md` |
| Stack o dependencias principales | Este CLAUDE.md |

---

## Pendiente / TODO

- [ ] **Migración de datos** con el dump actualizado de seguit v1 (traído de la oficina)
- [ ] Responsive completo para mobile/tablet
- [ ] Subida de imágenes de equipos (campo `urlImage` ya existe en el schema)
- [ ] Seguir con el rediseño visual sección por sección (en progreso)
