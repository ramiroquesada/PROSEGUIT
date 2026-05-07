# PROSEGUIT v2

Sistema de Gestión de Inventario IT.
Reemplaza a "seguit v1" (PHP/MySQL).

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
| Logging | Pino (pretty-print en dev, JSON en prod) | 10.x |
| Frontend | React + TypeScript + Vite | 19.2 / 5.9 / 8.0 |
| Routing | React Router | 7.13 |
| Estado servidor | TanStack Query | 5.94 |
| UI | CSS Modules + nesting nativo + custom properties. **NO Tailwind** | — |
| Íconos | Lucide React | — |
| Dev | Docker Compose (PostgreSQL en puerto **5433**) | — |

**Colores institucionales:** Teal `#00A79D` (primario), Navy `#003366` (secundario)

---

## Estado actual del proyecto (Abril 2026)

### ✅ Completado recientemente (abril 17)

- **Auto-fill modelo desde plantilla** — Al seleccionar una plantilla en el formulario de equipo (individual o masivo), el campo Modelo se rellena automáticamente con el nombre de la plantilla; el usuario puede editarlo libremente después
- **Carga masiva de equipos** — Nueva página `/equipos/lote` accesible desde botón en EquipmentListPage. Campos compartidos (tipo, plantilla, ubicación, fechas, etc.) + tabla por fila con serie editable, matrícula, MAC e IP. Genera N filas desde max(serie)+1, validación de duplicados client-side, envío secuencial con abort en primer error
- **Fix reset password** — `UsersPage` ahora muestra la contraseña temporal real devuelta por el backend al hacer reset, en lugar del mensaje desactualizado "la nueva contraseña es la ficha"
- **Equipment Templates Integration** — Validación de templateId, selector dropdown en formulario de equipos, reference card con datos de plantilla, invalidación de caché `['equipment']`
- **TemplatesPage Mejorada** — Edit functionality con ícono Pencil, editor dinámico de pares clave-valor para specs, ModalMode pattern (create/editar), validación de claves duplicadas

### ✅ Backend — 10 módulos completos

| Módulo | Endpoints principales |
|--------|----------------------|
| `auth` | POST login, refresh, logout |
| `equipment` | GET list/detail, POST crear, PUT editar, POST transfer/send-to-support/send-to-service/return-from-service |
| `locations` | GET tree, POST/PUT cities/sections/offices |
| `dashboard` | GET stats, GET recent-activity |
| `history` | GET list (paginado + filtros), GET by equipoId |
| `loans` | GET list, POST crear, POST return |
| `licenses` | GET list/summary/detail, POST crear, PUT editar, DELETE (con estado derivado) |
| `model-templates` | CRUD completo (admin only) |
| `service-providers` | CRUD completo (admin only) |
| `users` | CRUD + reset-password + change-password |

### ✅ Frontend — 12 páginas

| Ruta | Página | Descripción |
|------|--------|-------------|
| `/login` | LoginPage | Card centrada, gradiente navy, animación de entrada |
| `/cambiar-password` | ChangePasswordPage | Forzado en primer login |
| `/` | DashboardPage | Stats cards + actividad reciente clickeable |
| `/equipos` | EquipmentListPage | Tabla con búsqueda debounced, filtros en cascada, columnas ordenables, paginación con ventana de páginas |
| `/equipos/nuevo` | EquipmentFormPage | Formulario con plantillas de modelos |
| `/equipos/:id` | EquipmentDetailPage | Ficha + acciones + timeline + sección licencias |
| `/equipos/:id/editar` | EquipmentFormPage | Edición |
| `/equipos/lote` | BulkEquipmentPage | Carga masiva: campos compartidos + tabla por equipo con series correlativas |
| `/prestamos` | LoansPage | Lista + nuevo préstamo por serie |
| `/licencias` | LicensesPage | Resumen por software + tabla filtrable, estado derivado |
| `/ubicaciones` | LocationsPage | Árbol Ciudad›Sección›Oficina + panel de equipos |
| `/historial` | HistoryPage | Historial global con filtros y badges |
| `/plantillas` | TemplatesPage | CRUD plantillas de modelos (admin) |
| `/usuarios` | UsersPage | CRUD usuarios (admin) |

### ✅ Características implementadas
- Auth completa con JWT access + refresh tokens con **rotación automática** (cada refresh emite un nuevo refresh token, invalidando el anterior)
- Página de cambio de contraseña (`/cambiar-password`) — **redirige forzosamente** si `forcePasswordChange` es true (ProtectedRoute lo intercepta)
- Acciones de equipos: transferir (SALIDA), enviar a soporte (ENTRADA), enviar a servicio externo, dar de baja, retornar de servicio
- Historial completo de cada acción con motivo, ubicación origen/destino, técnico y fecha
- Préstamos: crear por número de serie, registrar devolución
- **Licencias de software**: gestión por equipo con estado derivado (VIGENTE, POR_VENCER, VENCIDA), búsqueda, filtros, resumen por software
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
- **Sección de licencias en ficha de equipo**: lista licencias del equipo con botón para agregar nuevas licencias rápidamente
- **Carga masiva de equipos** (`/equipos/lote`): botón desde EquipmentListPage, campos compartidos para todos los equipos del lote, tabla editable con serie/matrícula/MAC/IP por fila, generación automática desde max(serie)+1, validación client-side de duplicados, envío secuencial con abort en primer error, invalidación de `['equipment']` y `['dashboard']`

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

# Tests
npm test                 # Corre los 67 tests del backend (no requiere DB)
cd backend && npm run test:watch  # Modo watch durante desarrollo

# Migración de datos desde seguit v1 (ver sección completa abajo)
npm run migrate:v1   # Un solo comando: extrae JSON + repara DB + aplica migraciones + importa

# Individual (si concurrently falla)
npm run dev:backend      # Solo backend
npm run dev:frontend     # Solo frontend
```

---

## Migración de datos desde seguit v1

**Cuándo hacer esto:** cuando se trae un dump SQL actualizado de seguit v1 con nuevos equipos.

### Prerrequisitos
- Docker Desktop corriendo
- `db_seguit1.sql` colocado en la **raíz del proyecto** (`PROSEGUIT/`)

### Un solo comando

```bash
npm run db:up      # Solo si la DB no está corriendo
npm run migrate:v1 # Hace todo: extrae JSON + repara DB + aplica migraciones + importa datos
```

### Qué hace `npm run migrate:v1`

1. **`node extract_data.js`** — lee `db_seguit1.sql` y genera `export_datos_v1.json`
2. **Pre-flight checks** (dentro de `migrate-v1.ts`):
   - Verifica que `export_datos_v1.json` existe — falla con mensaje claro si no
   - Verifica conexión a la DB — falla con `npm run db:up` si no responde
   - Detecta y repara migración incompleta `estado_equipo_old` automáticamente si existe
   - Corre `prisma migrate deploy` para aplicar migraciones pendientes
   - Regenera el Prisma Client
3. **Importación de datos:**
   - Limpia datos existentes (historial, préstamos, equipos, tipos, servicios, oficinas v1)
   - Migra ubicaciones → Oficinas bajo `Mercedes > General`
   - Migra 35 tipos de equipo
   - Migra usuarios (password temporal = ficha, forcePasswordChange = true, excepto admin 9999)
   - Migra funcionarios, servicios externos
   - Migra equipos con estado ACTIVO
   - Migra historial mapeando texto libre a acciones: "propietario" → `ASIGNACION`, "se cambio la ubicacion" → `TRANSFERENCIA`, "se ingreso" → `RETORNO_SOPORTE`, "se envio a service" → `ENVIO_SERVICIO_EXTERNO`, "se creo" → `CREACION`
   - Migra préstamos (`fec_dev = '1900-01-01'` = préstamo activo)

### Advertencias importantes
- ⚠️ El script **borra datos existentes** antes de migrar — no correr sobre datos de producción con cambios nuevos
- Los equipos con `serie` duplicada se omiten (skipped) sin error fatal
- Se puede volver a correr el script sin problema si falla a mitad (la limpieza inicial lo resetea)
- Los warns que aparecen en consola son normales — son registros de historial con datos incompletos

### Si el script tira errores
- `ERROR: export_datos_v1.json no encontrado` → `db_seguit1.sql` no está en la raíz del proyecto
- `ERROR: No se puede conectar a la base de datos` → correr `npm run db:up` primero
- `ERROR: prisma migrate deploy falló` → revisar `cd backend && npx prisma migrate status`
- `P2002 Unique constraint` en tipos/ubicaciones → normal, son upserts, no es un error real

---

## Convenciones de código

- **CSS**: Módulos CSS con nesting nativo y custom properties. NO Tailwind, NO styled-components
- **Ancho de páginas**: páginas de listado (tabla) = sin `max-width`, ocupan todo el ancho del `.content`. Páginas de formulario/detalle = `max-width` centrado (ej: 800px form, 1200px detail). Nunca poner `max-width` en páginas de listado.
- **Estado de equipo**: nunca leer el campo `estado` de DB para mostrar en UI (puede estar desactualizado). Siempre usar `resolveEstado(eq.estado, eq.oficina.nombre)` de `frontend/src/lib/equipment-status.ts`. El backend deriva el estado del campo `tipo` de la oficina (no del nombre).
- **Ordenamiento en listado**: el backend acepta `sortBy` (`serie`|`modelo`|`tipo`) y `sortDir` (`asc`|`desc`) como query params. Al cambiar filtros se resetea el orden.
- **Íconos**: Lucide React (`import { Monitor, MapPin, ... } from 'lucide-react'`)
- **React 19**: usar `use(AuthContext)` en vez de `useContext()`, `<Context value={}>` sin `.Provider`
- **Prisma 7**: requiere adapter (`@prisma/adapter-pg`), config en `backend/prisma.config.ts`
- **Express 5**: async error handling nativo sin try/catch en controllers, nuevo path matching
- **API**: prefijo `/api/v1/`
- **Idioma UI**: Español (Uruguay) — "ficha", "técnico", "préstamo", "ubicación"
- **Mutaciones**: TanStack Query `useMutation` + `queryClient.invalidateQueries` al completar. Las mutaciones de equipos deben invalidar `['equipment']`, `['history', 'equipment', id]` **y** `['dashboard']`. Los hooks de dashboard usan claves `['dashboard', 'stats']` y `['dashboard', 'recent-activity', limit]` — el prefijo `['dashboard']` es suficiente para invalidar ambos.
- **staleTime**: todos los hooks tienen staleTime configurado (30s equipos/préstamos, 60s historial/usuarios). No modificar sin razón — evita refetch innecesario en cada cambio de ruta.
- **LocationCascadeSelect**: componente reutilizable en `frontend/src/components/LocationCascadeSelect.tsx`. Usarlo siempre que se necesite el cascade Ciudad→Sección→Oficina con creación inline. Props: `value: CascadeValue`, `onChange`, `onError`, `disabled`, `required`.
- **Constantes de acciones**: labels, colores y opciones de acciones de historial centralizados en `frontend/src/lib/action-types.ts` (`ACCION_LABEL`, `ACCION_COLOR`, `ACCION_OPTIONS`). No redefinir localmente en pages.
- **Code splitting**: todas las páginas se cargan con `React.lazy` en `App.tsx`. Si agregás una nueva página, importarla con `lazy(() => import(...))`.
- **Contraseñas de usuario**: al crear o resetear usuario, el backend genera una contraseña temporal aleatoria (8 chars hex) y la retorna una única vez en la respuesta. El frontend la muestra en un `alert()`. La ficha ya NO se usa como contraseña por defecto.
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
- `EN_REPARACION`, `EN_DEPOSITO`, `ACTIVO` → se derivan del campo `tipo` de la oficina (`SOPORTE` → `EN_REPARACION`, `DEPOSITO` → `EN_DEPOSITO`, `OFICINA` → `ACTIVO`)

### Observabilidad

- **Logger**: Pino con pretty-print en dev, JSON en prod. Cada request loguea método, ruta, status y duración.
- **Request ID**: cada request recibe un UUID (`X-Request-Id` header). Los errores 500 incluyen el `requestId` en la respuesta (no en prod).
- **Connection pooling**: pg Pool con `max: 10`, `idleTimeout: 30s`, `connectionTimeout: 5s`.
- **Health check**: `GET /api/v1/health` devuelve `{ status, timestamp, uptime, memory, db }`.
- **Performance**: índice compuesto `(equipo_id, fecha DESC)` en Historial para consultas de timeline.

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
│   │   └── migrations/20260322153214_init/  # Migración inicial (schema base)
│   │   └── migrations/20260328173932_add_estado_nuevo/  # Agrega NUEVO al enum estado_equipo
│   │   └── migrations/20260328200000_add_asignacion_accion/  # Agrega ASIGNACION al enum accion_tipo
│   ├── prisma.config.ts               # Config Prisma 7 con adapter pg
│   └── src/
│       ├── index.ts                   # Punto de entrada Express
│       ├── config/                    # env.ts (JWT_SECRET, DB URL, PORT)
│       ├── middleware/                # auth.ts, validate.ts, error-handler.ts, request-id.ts
│       ├── utils/                     # prisma.ts (pooling), pagination.ts, equipment-status.ts, logger.ts
│       └── modules/                   # Un directorio por dominio (ver tabla arriba)
│           └── {dominio}/
│               ├── {dominio}.routes.ts
│               ├── {dominio}.controller.ts
│               ├── {dominio}.service.ts
│               └── {dominio}.service.test.ts
│
├── frontend/
│   ├── vite.config.ts                 # Proxy /api → :3001
│   └── src/
│       ├── App.tsx                    # Router con ProtectedRoute + GuestRoute
│       ├── lib/
│       │   ├── api-client.ts          # Singleton con JWT auto-refresh
│       │   ├── auth-context.tsx       # AuthContext (React 19 use())
│       │   ├── equipment-status.ts    # resolveEstado(), STATUS_LABEL, STATUS_COLOR — derivar estado desde nombre de oficina
│       │   ├── action-types.ts        # Labels, colores y opciones de acciones centralizados
│       │   ├── license-status.ts      # resolveLicenseStatus() para estado derivado de licencias
│       │   ├── dashboard-helpers.ts   # Utilidades compartidas de widgets (urgencyColor)
│       │   └── find-soporte-office.ts # Busca la oficina de Soporte en el árbol de ubicaciones
│       ├── hooks/                     # useEquipment, useLocations, useHistory, useLoans, useUsers, useDashboard, usePageTitle, useLicenses
│       ├── components/layout/         # Sidebar.tsx, Header.tsx, MainLayout.tsx
│       ├── components/                # LocationCascadeSelect.tsx, dashboard/
│       ├── components/ui/             # DataTable.tsx (tabla + paginación reutilizable), StatusBadge.tsx
│       ├── pages/                     # 13 páginas (ver tabla arriba)
│       └── styles/                    # variables.css, reset.css, globals.css
│
└── packages/shared/src/
    └── schemas/                       # Schemas Zod compartidos (equipment.ts, user.ts)
```

---

## Modelos de datos (Prisma)

**Ubicaciones (3 niveles):** `Ciudad` → `Seccion` → `Oficina` (tipo: OFICINA | SOPORTE | DEPOSITO)

**Equipos:** `TipoEquipo` → `ModeloTemplate` → `Equipo` (estado: NUEVO | ACTIVO | EN_REPARACION | EN_DEPOSITO | PRESTADO | EN_SERVICIO_EXTERNO)

**Acciones:** `Historial` (accion: CREACION | ASIGNACION | EDICION | TRANSFERENCIA | ENVIO_SOPORTE | RETORNO_SOPORTE | PRESTAMO | DEVOLUCION | CAMBIO_ESTADO | ENVIO_SERVICIO_EXTERNO | RETORNO_SERVICIO_EXTERNO | FOTO_AGREGADA | FOTO_ELIMINADA)

**Otros:** `Prestamo`, `EnvioServicio`, `ServicioExterno`, `Usuario` (rol: ADMIN | TECNICO), `Funcionario`, `RefreshToken`, `Licencia`

---

## Usuarios

| Ficha | Contraseña | Rol | Notas |
|-------|-----------|-----|-------|
| `9999` | `admin123` | ADMIN | Usuario administrador |
| `7844` | `7844` | TECNICO | Ramiro Quesada |


---

## Problemas conocidos (Windows)

### Proceso Node no muere al detener
Los procesos de Node iniciados desde bash en VSCode quedan corriendo como procesos huérfanos incluso al cerrar la terminal, VSCode o la PC.

**Solución — matar por puerto (PowerShell):**
```powershell
# Mata todo lo que esté escuchando en los puertos del proyecto
powershell -Command "Stop-Process -Id (Get-NetTCPConnection -LocalPort 3001, 5173 -State Listen).OwningProcess -Force"
```

**O matar todos los procesos Node del sistema:**
```powershell
powershell -Command "Stop-Process -Name node -Force"
```

**Ver qué hay en un puerto específico:**
```bash
netstat -ano | findstr :3001
# El PID aparece al final de cada línea
```

> **Nota:** `taskkill /F /PID` no funciona desde bash en VSCode (el sandbox interpreta `/F` como ruta). Usar siempre `powershell -Command "Stop-Process ..."`.

**Solución definitiva si nada funciona:** reiniciar VSCode o la PC.

### Git push falla con "behind remote"
El hook `.githooks/pre-push` verifica que el repo local esté actualizado antes de pushear.
Si falla: `git pull origin main` primero.

### Migraciones de Prisma con cambios de Enums

**Problema técnico:** PostgreSQL no permite usar valores nuevos de enums en la misma transacción que se agregan.

```sql
-- ❌ Esto falla en PostgreSQL (no permitido en la misma transacción)
ALTER TYPE "estado_equipo" ADD VALUE 'NUEVO';
ALTER TABLE "equipo" ALTER COLUMN "estado" SET DEFAULT 'NUEVO';
```

**Solución implementada:** El script `npm run db:migrate` usa `prisma db push` en lugar de `prisma migrate dev`, que ejecuta las migraciones correctamente dividiendo los pasos.

**Para agregar nuevos valores de enum en el futuro:**

1. **Crear la migración normalmente** (Prisma lo hará)
2. **Si usa el nuevo valor inmediatamente** (ej: SET DEFAULT, CHECK constraint), dividir en dos migraciones:
   - Primera: solo `ALTER TYPE ... ADD VALUE`
   - Segunda: usar el nuevo valor
3. **Ejemplo:**
   ```sql
   -- Migration A (20260401120000_add_new_status/migration.sql)
   ALTER TYPE "estado_equipo" ADD VALUE 'PENDIENTE';
   
   -- Migration B (20260401120001_set_pendiente_default/migration.sql)
   ALTER TABLE "equipo" ALTER COLUMN "estado" SET DEFAULT 'PENDIENTE';
   ```

El script `backend/prisma/migrate-with-enums.ts` maneja esto automáticamente sin que tengas que hacer nada especial.

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

## Configuración de producción (Docker)

Los tres servicios se levantan con un solo comando usando `docker-compose.prod.yml`:

| Servicio | Imagen | Puerto interno | Descripción |
|----------|--------|----------------|-------------|
| `postgres` | postgres:17-alpine | 5432 | Base de datos (volumen persistido) |
| `backend` | build local | 3001 | API Express (no expuesto al host) |
| `frontend` | build local → nginx | 80 | React SPA + proxy `/api` → backend |

### Primer deploy en un servidor nuevo

```bash
# 1. Clonar el repo en el servidor
git clone <url-del-repo> proseguit && cd proseguit

# 2. Crear el archivo de variables de entorno
cp .env.production.example .env.production
# Editar .env.production y completar: POSTGRES_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET

# 3. Construir y levantar todo
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# 4. Cargar datos iniciales (admin 9999, técnico 7844)
docker compose -f docker-compose.prod.yml exec backend npx tsx prisma/seed.ts
```

Las migraciones de DB se aplican automáticamente al iniciar el backend (`prisma migrate deploy`).

### Actualizar a una versión nueva

```bash
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

### Ver logs

```bash
docker compose -f docker-compose.prod.yml logs -f backend    # logs del API
docker compose -f docker-compose.prod.yml logs -f frontend   # logs de nginx
```

### Notas técnicas
- El backend corre con `tsx` (TypeScript directo), sin paso de compilación — evita problemas de resolución de módulos con `@proseguit/shared` que apunta a fuente `.ts`
- El frontend se compila con Vite en el Docker build y nginx sirve el `dist/` estático
- nginx también hace proxy de `/api` al servicio `backend:3001` — el frontend no necesita saber la IP del backend
- Los secrets **nunca** van al repo; `.env.production` está en `.gitignore`

---

## Pendiente / TODO


- [ ] **Sistema de alertas** — notificaciones in-app (y opcionalmente email) para: garantías por vencer, equipos sin mantenimiento, licencias próximas a expirar, equipos obsoletos por fecha de fin de vida
- [ ] **Gestión de costos** — precio de compra, depreciación opcional, costo total por área/ciudad/sección. Visible en dashboard analítico
- [ ] **Dashboard analítico ampliado** — widgets configurables: equipos por tipo/área, costos acumulados, comparativas por período, gráficos de estado general



- [ ] **Automatizaciones** — reglas simples configurables: recordatorios automáticos, cambio de estado al cumplir condición, notificación al técnico asignado
- [x] **Carga masiva de equipos** — `/equipos/lote` con campos compartidos y series correlativas editables por fila
- [ ] **CSV/Excel** — carga masiva de usuarios o licencias desde planilla o export de las mismas
- [ ] **Mapa lógico de ubicaciones** — visualización de árbol ciudad/sección/oficina con contadores de equipos por nodo
