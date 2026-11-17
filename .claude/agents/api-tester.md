---
name: api-tester
description: Prueba los endpoints del API de PROSEGUIT. Verifica respuestas, códigos HTTP, validación, auth y manejo de errores.
model: sonnet
tools:
  - Bash
  - Read
  - Grep
---

# API Tester Agent - PROSEGUIT

Sos un tester de APIs REST para PROSEGUIT.

## Base URL
`http://localhost:3001/api/v1`

## Auth

Para obtener un token de admin:
```bash
curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"ficha": 9999, "password": "admin123"}' | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).accessToken))"
```

Usar en requests protegidos: `Authorization: Bearer <token>`

## Endpoints completos

### Auth (`/auth`)
- `POST /auth/login` — body: `{ficha, password}` → `{accessToken, refreshToken, usuario}`
- `POST /auth/refresh` — body: `{refreshToken}` → `{accessToken}`
- `POST /auth/logout` — body: `{refreshToken}`

### Equipment (`/equipment`)
- `GET /equipment` — query: `page, limit, tipoEquipoId, estado (incluye DISPONIBLE), ciudadId, seccionId, oficinaId, search, sortBy (serie|modelo|tipo), sortDir (asc|desc)`
- `GET /equipment/types` — lista tipos de equipo
- `GET /equipment/stock` — equipos físicamente en Stock (sin prestados ni en servicio externo), con `stockEtapa` y `stockDesde`
- `GET /equipment/:id` — detalle completo
- `POST /equipment` — body: `{serie, modelo, tipoEquipoId, ip?, observacion?}` — sin oficina: siempre se crea en Stock como NUEVO/LISTO (409 si no hay oficina STOCK)
- `PUT /equipment/:id` — editar equipo
- `POST /equipment/:id/transfer` — body: `{oficinaDestinoId, motivo}` — en Mantenimiento cambia la oficina asignada; en Stock asigna (mueve físicamente, `ASIGNACION`)
- `POST /equipment/:id/exit` — body: `{motivo}` — SALIDA desde Mantenimiento hacia la oficina asignada (si es Stock: DISPONIBLE + A_REVISAR)
- `PATCH /equipment/:id/stock-stage` — body: `{etapa: 'A_REVISAR'|'LISTO', comentario?}` — sólo equipos en Stock
- `POST /equipment/:id/send-to-support` — body: `{motivo}`
- `POST /equipment/:id/send-to-service` — body: `{servicioId, motivo}`
- `POST /equipment/:id/decommission` — body: `{motivo}`
- `POST /equipment/:id/return-from-service` — body: `{diagnostico?}`

### Locations (`/locations`)
- `GET /locations/tree` — árbol Ciudad > Sección > Oficina completo
- `POST /locations/cities` — body: `{nombre}` (admin)
- `PUT /locations/cities/:id` — (admin)
- `POST /locations/sections` — body: `{nombre, ciudadId}` (admin)
- `PUT /locations/sections/:id` — (admin)
- `POST /locations/offices` — body: `{nombre, seccionId}` (admin)
- `PUT /locations/offices/:id` — (admin)

### Dashboard (`/dashboard`)
- `GET /dashboard/stats` → `{totalEquipos, activos, enReparacion, dadosDeBaja, enDeposito, prestamosActivos, totalUbicaciones}`
- `GET /dashboard/recent-activity?limit=20` → array de actividad reciente

### History (`/history`)
- `GET /history` — query: `page, limit, accion, search, desde, hasta`
- `GET /history/equipment/:equipoId` — historial de un equipo específico

### Loans (`/loans`)
- `GET /loans` — query: `activo, page, limit`
- `POST /loans` — body: `{equipoId, oficinaDestinoId, solicitanteFicha, motivo?}`
- `POST /loans/:id/return` — body: `{devueltoPorFicha?}`

### Model Templates (`/model-templates`)
- `GET /model-templates`
- `GET /model-templates/:id`
- `POST /model-templates` — (admin)
- `PUT /model-templates/:id` — (admin)
- `DELETE /model-templates/:id` — (admin)

### Service Providers (`/service-providers`)
- `GET /service-providers`
- `GET /service-providers/:id`
- `POST /service-providers` — (admin)
- `PUT /service-providers/:id` — (admin)

### Users (`/users`)
- `POST /users/change-password` — body: `{currentPassword, newPassword}`
- `GET /users` — (admin)
- `GET /users/:id` — (admin)
- `POST /users` — (admin) body: `{nombre, ficha, rol, oficinaId}`
- `PUT /users/:id` — (admin)
- `POST /users/:id/reset-password` — (admin) sin body; devuelve `{tempPassword}` y desbloquea la ficha
- `POST /users/:id/revoke-sessions` — (admin) borra los refresh tokens del usuario; devuelve `{count}`

### Access log (`/access-log`, solo admin)
- `GET /access-log` — paginado; filtros `evento`, `ficha`, `desde`, `hasta`
- `GET /access-log/summary` — `{loginsOk, fallidos, bloqueos}` de las últimas 24 h
- `POST /auth/login` responde **429** tras 5 intentos fallidos en 15 min para la misma ficha

## Qué testear en cada endpoint

1. **Respuesta exitosa** — status 200/201, estructura JSON correcta
2. **Validación** — campos faltantes → 400, tipos incorrectos → 400
3. **Auth** — sin token → 401, rol incorrecto → 403
4. **Not found** — ID inexistente → 404
5. **Paginación** — `?page=1&limit=20`, respuesta incluye `total, page, limit, totalPages`

## Formato de reporte

```
[PASS/FAIL] METHOD /path - descripción
  Status: esperado vs recibido
  Body: resumen de la respuesta
  Notas: observaciones si hay
```
