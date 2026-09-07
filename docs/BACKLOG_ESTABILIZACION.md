# PROSEGUIT — Backlog de estabilización

Este backlog convierte el plan general en unidades ejecutables. Cada ticket debe terminar con evidencia, pruebas y actualización de documentación.

## Fase 0 — Preservación y decisiones

- [x] **F0-01** Crear rama `codex/estabilizacion-produccion` desde la línea base.
- [x] **F0-02** Crear backup externo de PostgreSQL, archivos fuente y uploads.
- [x] **F0-03** Restaurar el backup en una base descartable y verificar totales.
- [x] **F0-04** Comprobar que datos sensibles no estén versionados ni en el historial de Git.
- [ ] **F0-05** Definir servidor objetivo, sistema operativo, DNS, HTTPS y responsables.
- [ ] **F0-06** Definir política de backups, retención, acceso, RPO y RTO.
- [ ] **F0-07** Preparar entornos separados de desarrollo, QA/preproducción y producción.
- [ ] **F0-08** Definir quién aprueba la jerarquía definitiva de ubicaciones y los totales migrados.

## Bloque 1 — Build y configuración

- [x] **BLD-01** Reproducir y corregir el build TypeScript del backend.
  - Aceptación: `npm ci && npm run build` completa desde un checkout limpio.
  - Aceptación: backend arranca con `node backend/dist/index.js` y no con `tsx`.
- [x] **BLD-02** Empaquetar correctamente `@proseguit/shared` para frontend y backend.
- [x] **CFG-01** Validar variables de entorno al inicio con errores seguros y claros.
- [x] **CFG-02** Crear `.dockerignore` y verificar que secretos, dumps y uploads no entren al contexto.
- [ ] **CFG-03** Separar configuración de desarrollo, test, preproducción y producción.
- [x] **DEP-01** Auditar las 33 vulnerabilidades reportadas por `npm audit` después de una instalación limpia.
  - Priorizar las 2 críticas y 21 altas.
  - Actualizar de forma controlada y ejecutar regresión; no usar `--force` sin analizar cambios incompatibles.
- [ ] **DEP-02** Aislar el CLI de Prisma del runtime y resolver sus 4 avisos altos transitivos cuando exista una actualización compatible.
- [ ] **DEP-03** Resolver el aviso bajo restante de `esbuild` y mantener auditoría continua en CI.
- [ ] **OPS-01** Hacer que health check consulte realmente PostgreSQL.
- [x] **OPS-02** Incorporar graceful shutdown del servidor y del pool de conexiones.

## Bloque 2 — Seguridad

- [ ] **SEC-01** Inventariar usuarios migrados y estrategia de reseteo sin exponer contraseñas.
- [ ] **SEC-02** Invalidar credenciales conocidas y exigir cambio en primer acceso.
- [ ] **SEC-03** Eliminar credenciales por defecto de producción y rotar secretos JWT.
- [ ] **SEC-04** Añadir rate limiting y bloqueo progresivo al login.
- [ ] **SEC-05** Probar permisos ADMIN/TECNICO en API y UI.
- [ ] **SEC-06** Auditar login fallido, reset, cambio de contraseña y cambio de rol.
- [ ] **SEC-07** Revisar rotación, revocación y almacenamiento de refresh tokens.
- [ ] **UPL-01** Validar contenido real y formato permitido de imágenes.
- [ ] **UPL-02** Normalizar extensión, nombre, tamaño, cantidad y dimensiones.
- [ ] **UPL-03** Aplicar headers seguros a uploads y definir cache apropiado.

## Bloque 3 — Integridad de datos y transacciones

- [x] **DAT-01** Generar un reporte repetible de inconsistencias de préstamos y estados.
- [x] **DAT-02** Diseñar un registro de anomalías para marcar datos migrados como `A_REVISAR` sin alterar el original.
- [x] **DAT-03** Integrar la detección de anomalías al proceso repetible de migración desde SEGUIT v1.
- [x] **DAT-04** Hacer préstamo y devolución atómicos.
- [x] **DAT-05** Activar una prueba real de concurrencia sobre préstamos.
- [ ] **DAT-06** Definir y aplicar una única fuente de verdad para el estado del equipo.
- [ ] **DAT-07** Reconciliar oficinas SOPORTE/DEPOSITO, servicios, préstamos y estados.
- [ ] **DAT-08** Ensayar dump final → importación → auditoría → revisión en una base descartable.
- [ ] **DAT-09** Convertir correcciones inequívocas en reglas de migración deterministas y versionadas.
- [ ] **DAT-10** Resolver las anomalías del corte y recién entonces aplicar la restricción de un préstamo activo por equipo.
- [ ] **DAT-11** Verificar que migraciones hacia adelante y rollback operativo no pierdan datos.

## Bloque 4 — Defectos funcionales

- [ ] **BUG-01** Corregir fechas absurdas en alertas de reparación.
- [ ] **BUG-02** Evitar conteos duplicados de equipos prestados en dashboard.
- [ ] **BUG-03** Hacer atómica la carga masiva o devolver resultados exactos por fila.
- [ ] **BUG-04** Corregir errores de lint sin ocultarlos mediante excepciones generales.
- [ ] **BUG-05** Convertir cada corrección en una prueba de regresión.

## Bloque 5 — Ubicaciones y preparación de datos

- [ ] **UBI-01** Especificar el flujo de movimiento individual con usuario responsable.
- [ ] **UBI-02** Agregar acción `Mover oficina…` con ciudad y sección destino.
- [ ] **UBI-03** Mostrar impacto, confirmar y auditar el movimiento.
- [ ] **UBI-04** Permitir crear una sección real dentro del flujo si hace falta.
- [ ] **UBI-05** Diseñar árbol completo con búsqueda, multiselección y cambios pendientes.
- [ ] **UBI-06** Implementar endpoint transaccional de movimientos masivos.
- [ ] **UBI-07** Implementar reorganización masiva con vista previa y deshacer local.
- [ ] **UBI-08** Exportar comparación antes/después y validar totales.
- [ ] **UBI-09** Aprobar formalmente la jerarquía cargada.

## Bloque 6 — QA y CI

- [x] **QA-01** Crear base descartable y setup automático para integración.
- [x] **QA-02** Ejecutar la app dentro de las pruebas, sin puerto externo fijo.
- [ ] **QA-03** Cubrir auth, permisos, equipos, ubicaciones, préstamos y uploads en API.
- [ ] **QA-04** Agregar pruebas de componentes frontend.
- [ ] **QA-05** Agregar E2E de los diez recorridos críticos del plan general.
- [ ] **QA-06** Ejecutar pruebas de concurrencia e idempotencia.
- [ ] **QA-07** Crear pipeline con instalación, build, lint, test y escaneos.
- [ ] **QA-08** Completar QA exploratorio de escritorio, móvil y accesibilidad.

## Bloque 7 — Producción nativa

- [ ] **NAT-01** Elegir Windows Server o Linux y documentar la decisión.
- [ ] **NAT-02** Instalar PostgreSQL 17 nativo en preproducción.
- [ ] **NAT-03** Ejecutar backend compilado como servicio sin privilegios.
- [ ] **NAT-04** Servir frontend y proxy inverso con HTTPS.
- [ ] **NAT-05** Separar aplicación, datos, uploads, logs y secretos.
- [ ] **NAT-06** Automatizar instalación, actualización y rollback.
- [ ] **NAT-07** Configurar backups fuera del servidor y alertas de fallo.
- [ ] **NAT-08** Probar restauración, reinicio, carga y recuperación.
- [ ] **NAT-09** Mantener Docker como contingencia durante estabilización.

## Bloque 8 — Preproducción y salida

- [ ] **REL-01** Desplegar una copia representativa en preproducción.
- [ ] **REL-02** Ejecutar integridad, regresión y pruebas de carga.
- [ ] **REL-03** Completar UAT con administrador y técnicos.
- [ ] **REL-04** Ensayar runbook de corte y rollback.
- [ ] **REL-05** Resolver o aceptar formalmente todos los P0/P1.
- [ ] **REL-06** Ejecutar decisión GO/NO-GO.
- [ ] **REL-07** Realizar corte, smoke test y habilitación escalonada.
- [ ] **REL-08** Cumplir período de estabilización y transferir operación.
