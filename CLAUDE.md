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
| `equipment` | GET list/detail, POST crear, PUT editar, POST transfer/send-to-support/send-to-service/decommission/return-from-service |
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
| `/equipos` | EquipmentListPage | Tabla con filtros, paginación, búsqueda |
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
- Cambio de contraseña forzado en primer login
- Acciones de equipos: transferir, enviar a soporte, enviar a servicio externo, dar de baja, retornar de servicio
- Historial completo de cada acción con motivo, ubicación origen/destino, técnico y fecha
- Préstamos: crear por número de serie, registrar devolución
- Árbol de ubicaciones de 3 niveles con CRUD
- Panel lateral en ubicaciones que muestra equipos de la oficina seleccionada
- Sidebar con íconos Lucide, gradiente navy, footer fijo con usuario
- Header sticky con nombre del usuario logueado y breadcrumb para subrutas
- Dashboard con saludo personalizado según hora del día
- Script de migración desde seguit v1 (`backend/prisma/migrate-v1.ts`)

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
8. **Migra historial** — mapea texto libre de v1 a tipos de acción de v2
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
- **Íconos**: Lucide React (`import { Monitor, MapPin, ... } from 'lucide-react'`)
- **React 19**: usar `use(AuthContext)` en vez de `useContext()`, `<Context value={}>` sin `.Provider`
- **Prisma 7**: requiere adapter (`@prisma/adapter-pg`), config en `backend/prisma.config.ts`
- **Express 5**: async error handling nativo sin try/catch en controllers, nuevo path matching
- **API**: prefijo `/api/v1/`
- **Idioma UI**: Español (Uruguay) — "ficha", "técnico", "préstamo", "ubicación"
- **Mutaciones**: TanStack Query `useMutation` + `queryClient.invalidateQueries` al completar

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
│   │   └── migrations/20260322153214_init/  # Única migración (schema inicial)
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
│       │   └── auth-context.tsx       # AuthContext (React 19 use())
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

**Equipos:** `TipoEquipo` → `ModeloTemplate` → `Equipo` (estado: ACTIVO | EN_REPARACION | DADO_DE_BAJA | EN_DEPOSITO | PRESTADO | EN_SERVICIO_EXTERNO)

**Acciones:** `Historial` (accion: CREACION | TRANSFERENCIA | ENVIO_SOPORTE | RETORNO_SOPORTE | PRESTAMO | DEVOLUCION | BAJA | CAMBIO_ESTADO | EDICION | ENVIO_SERVICIO_EXTERNO | RETORNO_SERVICIO_EXTERNO)

**Otros:** `Prestamo`, `EnvioServicio`, `ServicioExterno`, `Usuario` (rol: ADMIN | TECNICO), `Funcionario`, `RefreshToken`

---

## Usuarios

| Ficha | Contraseña | Rol | Notas |
|-------|-----------|-----|-------|
| `9999` | `admin123` | ADMIN | Usuario administrador |
| `7844` | `7844` | TECNICO | Ramiro Quesada — forzar cambio de contraseña |

Después de migrar v1, todos los usuarios importados tienen `forcePasswordChange: true` y su contraseña temporal es su número de ficha.

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
- [ ] Export a Excel de equipos y historial
- [ ] Subida de imágenes de equipos (campo `urlImage` ya existe en el schema)
- [ ] Seguir con el rediseño visual sección por sección (en progreso)
- [ ] Dashboard: hacer clickeables las stat cards para filtrar por estado
