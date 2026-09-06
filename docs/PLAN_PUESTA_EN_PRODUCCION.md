# PROSEGUIT — Plan integral de estabilización, mejora y puesta en producción

**Versión inicial:** 6 de septiembre de 2026  
**Estado del documento:** borrador de trabajo basado en auditoría técnica y funcional inicial  
**Objetivo:** llevar PROSEGUIT desde su estado actual a una operación productiva segura, verificable y mantenible, sin perder la posibilidad de seguir mejorándolo.

---

## 1. Decisión actual

PROSEGUIT tiene una base funcional amplia y una interfaz utilizable, pero **todavía no debe publicarse en producción**.

Los motivos principales son:

- credenciales temporales o débiles en los datos migrados;
- inconsistencias en préstamos activos y estados de equipos;
- compilación productiva del backend fallida;
- cobertura de pruebas insuficiente y pruebas de integración que no son confiables;
- manejo de archivos subidos que requiere endurecimiento;
- defectos visibles en dashboard y carga masiva;
- falta de herramientas adecuadas para terminar la organización de ciudades, secciones y oficinas;
- operación, respaldos, recuperación y despliegue nativo todavía no definidos ni ensayados.

La salida a producción será un **GO** únicamente cuando se cumplan los criterios de las fases 0 a 5 de este plan.

---

## 2. Estado de partida confirmado

### Arquitectura

- Monorepo con npm workspaces.
- Frontend: React 19, TypeScript, Vite y TanStack Query.
- Backend: Express 5, TypeScript, Prisma y PostgreSQL 17.
- Autenticación JWT con access token y refresh token.
- Archivos de equipos almacenados en disco.
- Desarrollo y despliegue documentados actualmente alrededor de Docker Compose.
- El frontend puede compilar; el backend no completa actualmente su build de TypeScript.
- La imagen de backend evita el problema de build ejecutando el código TypeScript con `tsx`.

### Datos actuales

- Aproximadamente 1.300 equipos migrados desde SEGUIT v1.
- 9 ciudades registradas.
- 14 secciones, 106 oficinas y 1.307 equipos concentrados actualmente en Mercedes.
- La distribución hacia las demás ciudades es trabajo manual pendiente; no se considera por sí sola una corrupción de datos.
- Se detectaron equipos con más de un préstamo activo.
- Los préstamos activos y el campo de estado almacenado no son coherentes entre sí.
- La migración dejó usuarios con contraseñas previsibles o compartidas, por lo que las credenciales no son aceptables para producción.

### Calidad técnica

- 67 pruebas unitarias del backend pasan.
- Cobertura de líneas observada: aproximadamente 22 %.
- Las pruebas de integración dependen de un servidor externo en un puerto fijo, pueden modificar datos y no ofrecen aislamiento reproducible.
- Existe una prueba de concurrencia omitida precisamente sobre un flujo crítico.
- El frontend no tiene una suite automatizada de componentes o flujos de usuario.
- El lint del frontend reporta 34 errores.

### Experiencia de usuario

- El recorrido visual inicial es bueno y el dashboard responde correctamente en distintos tamaños.
- No se observaron errores de consola en el recorrido básico realizado.
- El editor de ubicaciones permite mover una oficina únicamente hacia una sección visible de la ciudad seleccionada. Esto dificulta seriamente la reclasificación pendiente.
- La creación masiva realiza solicitudes secuenciales y puede dejar una carga parcialmente creada aunque el mensaje final sugiera que no se creó nada.
- El dashboard puede contar préstamos duplicados y mostrar antigüedades de reparación absurdas por un fallback de fecha al inicio de Unix.

### Operación y seguridad

- Falta limitar intentos de inicio de sesión.
- El backend confía demasiado en el MIME y la extensión proporcionados durante la subida de imágenes.
- Los archivos subidos se sirven antes de aplicar los headers de seguridad generales.
- Falta un `.dockerignore`; el contexto de build puede incluir archivos de entorno, artefactos y uploads innecesarios.
- El health check informa que la base está conectada sin hacer una comprobación real de la conexión.
- No hay un procedimiento probado de backup, restauración, monitoreo y rollback.

---

## 3. Prioridades

### P0 — Bloquea producción

- Seguridad de cuentas, secretos y sesiones.
- Integridad de préstamos, estados e historial.
- Build productivo reproducible del backend.
- Subidas de archivos seguras.
- Backups y restauración probados.
- Pruebas confiables sobre los recorridos críticos.
- Entorno de preproducción representativo.

### P1 — Necesario para operar correctamente

- Herramientas de reorganización de ubicaciones.
- Corrección del dashboard y de la carga masiva.
- Observabilidad, logs, alertas y procedimientos operativos.
- Despliegue nativo ensayado, si se adopta esa alternativa.
- Manuales mínimos para técnicos y administradores.

### P2 — Mejora posterior a una base estable

- Importaciones desde CSV/Excel.
- Alertas inteligentes.
- Analítica y nuevos widgets.
- Automatizaciones y notificaciones.
- Mejoras adicionales de accesibilidad y experiencia móvil.

---

## 4. Estrategia por etapas

## Fase 0 — Congelar la línea base y tomar decisiones

**Objetivo:** proteger lo existente y eliminar ambigüedades antes de modificar código o datos.

### Trabajo

1. Crear una rama de estabilización y etiquetar el estado inicial auditado.
2. Generar backups separados de:
   - PostgreSQL;
   - uploads;
   - dump y archivos originales de SEGUIT v1;
   - exportaciones intermedias de la migración.
3. Verificar que `.env`, dumps, exportaciones con datos y uploads no estén versionados ni incluidos en artefactos.
4. Definir tres entornos separados:
   - desarrollo;
   - preproducción con datos anonimizados o copia controlada;
   - producción.
5. Registrar las decisiones aún pendientes:
   - sistema operativo del servidor productivo;
   - nombre DNS y certificado HTTPS;
   - responsables de infraestructura, datos y aceptación funcional;
   - cantidad esperada de usuarios y concurrencia;
   - política de contraseñas y recuperación de acceso;
   - ventana de corte y tiempo máximo tolerable de caída;
   - retención de backups, logs e historial;
   - autoridad responsable de aprobar la jerarquía de ubicaciones.
6. Crear un inventario de datos sensibles y definir quién puede acceder a cada entorno.

### Salida de fase

- Backup inicial creado y restaurado exitosamente en una base desechable.
- Datos sensibles fuera del repositorio y de las imágenes.
- Entornos, responsables y decisiones de infraestructura documentados.
- Estado inicial recuperable mediante tag o commit identificado.

**Estimación preliminar:** 1 a 3 días.

---

## Fase 1 — Estabilización técnica, seguridad e integridad

**Objetivo:** corregir todo lo que puede comprometer cuentas, datos o un despliegue.

### 1.1 Build y configuración

- Corregir la relación del paquete compartido con el backend para producir JavaScript compilado y ejecutable.
- Conseguir que `npm run build` complete frontend y backend desde una instalación limpia.
- Ejecutar producción con `node dist/index.js`, no con `tsx` ni código fuente.
- Validar variables de entorno al arrancar y fallar con mensajes claros si faltan secretos o conexión.
- Agregar `.dockerignore` aunque Docker quede únicamente como herramienta de desarrollo o contingencia.
- Separar explícitamente configuración de desarrollo, pruebas, preproducción y producción.

### 1.2 Autenticación y autorización

- Invalidar contraseñas temporales migradas y exigir cambio en el primer acceso.
- Eliminar credenciales por defecto de cualquier procedimiento productivo.
- Rotar secretos JWT antes de la puesta en marcha.
- Añadir rate limiting y bloqueo temporal progresivo al login.
- Revisar duración, rotación, revocación y almacenamiento de refresh tokens.
- Probar una matriz de permisos ADMIN/TECNICO sobre todos los endpoints y pantallas.
- Registrar eventos de seguridad relevantes: login fallido, reset, cambio de contraseña y cambios de rol.

### 1.3 Préstamos y consistencia de equipos

- Identificar y resolver manualmente los préstamos activos duplicados existentes.
- Crear una restricción de base de datos que impida más de un préstamo activo por equipo.
- Convertir préstamo y devolución en transacciones atómicas.
- Definir una única fuente de verdad para el estado del equipo.
- Reconciliar equipos, oficinas especiales, préstamos y servicios externos.
- Crear un reporte repetible de inconsistencias que pueda ejecutarse antes y después de cada migración.
- Habilitar y aprobar pruebas de concurrencia para préstamos y otros movimientos sensibles.

### 1.4 Subidas de imágenes

- Validar el contenido real del archivo, no solamente el MIME enviado por el navegador.
- Permitir únicamente formatos definidos y normalizar la extensión final.
- Generar nombres aleatorios del lado servidor.
- Definir límites de tamaño, cantidad y dimensiones.
- Servir uploads con `nosniff`, CSP y una política de descarga/cache apropiada.
- Evaluar almacenamiento fuera del directorio de la aplicación y un proceso de backup consistente.

### 1.5 Defectos funcionales bloqueantes

- Corregir el cálculo de alertas de reparación cuando no existe una fecha válida.
- Evitar que el dashboard cuente varias veces un mismo equipo con préstamos duplicados.
- Hacer atómica la carga masiva o reportar con exactitud cada fila creada y fallida.
- Corregir los 34 errores de lint sin desactivar reglas para ocultar problemas reales.
- Revisar todos los errores detectados durante build y convertirlos en regresiones automatizadas.

### Salida de fase

- Build completo limpio desde checkout nuevo.
- Cero secretos o uploads incorporados a artefactos.
- Cero préstamos activos duplicados.
- Restricciones y transacciones impiden recrear las inconsistencias.
- Usuarios productivos con credenciales únicas y cambio obligatorio aplicado.
- Carga masiva no puede dejar resultados ambiguos.
- Lint y pruebas unitarias en verde.

**Estimación preliminar:** 1 a 2 semanas.

---

## Fase 2 — Herramientas para organizar y validar ubicaciones

**Objetivo:** permitir terminar la jerarquía real sin secciones temporales ni maniobras inseguras.

### 2.1 Movimiento individual

Agregar a cada oficina una acción **Mover oficina…** con:

- ruta actual claramente visible;
- selector de ciudad destino;
- selector filtrado de sección destino;
- creación inline de una sección real si todavía no existe;
- resumen de la cantidad de equipos afectados;
- confirmación y mensaje final inequívoco;
- entrada en historial con origen, destino, usuario y fecha.

No se hará nullable `seccionId` ni se crearán ubicaciones temporales. La jerarquía continuará siendo Ciudad → Sección → Oficina.

### 2.2 Reorganización masiva

Crear un modo específico para la carga inicial de la estructura:

- árbol completo de ciudades, secciones y oficinas;
- buscador por nombre;
- filtros para elementos todavía no clasificados;
- selección múltiple de oficinas;
- arrastre entre ciudades con apertura de sus secciones;
- opción alternativa de mover mediante selectores para teclado y móvil;
- lista de cambios pendientes;
- deshacer antes de guardar;
- vista previa de impacto;
- aplicación final en una transacción de base de datos;
- respuesta por operación ante conflictos, sin escrituras parciales.

### 2.3 Validación de la carga manual

- Exportar la jerarquía antes y después para comparación.
- Detectar nombres duplicados, secciones vacías y oficinas sin equipos.
- Revisar oficinas de tipo SOPORTE y DEPOSITO, porque influyen en el estado calculado.
- Confirmar totales por ciudad, sección y oficina con el responsable funcional.
- Hacer una prueba de muestra antes de reorganizar las 106 oficinas.

### Salida de fase

- Una oficina puede moverse a otra ciudad sin crear estructuras ficticias.
- Los cambios masivos son revisables, atómicos y auditables.
- La jerarquía completa queda aprobada por el responsable de negocio.
- Los totales de equipos antes y después coinciden.

**Estimación preliminar:** 1 a 2 semanas, incluyendo la carga y validación humana.

---

## Fase 3 — QA automatizado y funcional

**Objetivo:** poder afirmar con evidencia que los recorridos críticos funcionan y seguir detectando regresiones.

### 3.1 Pirámide de pruebas

#### Unitarias

- Elevar cobertura sobre servicios de préstamos, ubicaciones, equipos, auth, licencias y dashboard.
- Priorizar ramas de error y reglas de negocio, no perseguir cobertura numérica vacía.
- Objetivo inicial orientativo: 70 % en servicios críticos y 50 % global del backend.

#### Integración API + base de datos

- Arrancar la aplicación desde las propias pruebas, sin puerto fijo externo.
- Usar una base exclusiva y descartable por ejecución.
- Aplicar migraciones automáticamente.
- Limpiar o aislar datos entre pruebas.
- Cubrir restricciones, transacciones, permisos, uploads y concurrencia.

#### Frontend

- Agregar pruebas de componentes para formularios, errores, filtros y permisos.
- Verificar estados de carga, vacío, error y reintento.
- Cubrir accesibilidad básica: labels, foco, teclado y mensajes de validación.

#### End-to-end

Automatizar al menos estos recorridos:

1. Login, refresh, logout y cambio obligatorio de contraseña.
2. Alta, edición, búsqueda y consulta de un equipo.
3. Transferencia entre oficinas y verificación del historial.
4. Movimiento individual y masivo de oficinas.
5. Préstamo, intento de préstamo duplicado y devolución.
6. Envío a soporte, servicio externo y retorno.
7. Alta y vencimiento de licencias.
8. Subida, visualización y eliminación de imágenes válidas; rechazo de archivos inválidos.
9. Gestión de usuarios y verificación de permisos.
10. Carga masiva con éxito, duplicados y fallo intermedio.

### 3.2 QA exploratorio

- Escritorio y móvil en navegadores soportados.
- Navegación por teclado y zoom al 200 %.
- Conexión lenta, pérdida temporal de red y expiración de sesión.
- Doble clic, reenvío accidental y acciones simultáneas.
- Textos largos, caracteres especiales, fechas límites y listas vacías.
- Volumen representativo: 1.300+ equipos y más de 4.000 eventos de historial.

### 3.3 CI

Cada cambio deberá pasar automáticamente:

- instalación limpia reproducible;
- build backend y frontend;
- lint;
- pruebas unitarias;
- pruebas de integración;
- smoke E2E;
- verificación de migraciones;
- escaneo de dependencias y secretos.

### Salida de fase

- Suite reproducible en una máquina limpia.
- Cero pruebas omitidas en flujos críticos.
- Todos los recorridos principales cuentan con evidencia automatizada o caso manual documentado.
- No hay defectos P0/P1 abiertos sin una aceptación explícita del riesgo.

**Estimación preliminar:** 1,5 a 3 semanas; puede solaparse parcialmente con las fases 1 y 2.

---

## Fase 4 — Arquitectura productiva y migración de Docker a nativo

**Objetivo:** decidir con evidencia el modo de operación y ensayar el despliegue elegido sin comprometer la única copia de los datos.

### Principio

Es técnicamente posible ejecutar PROSEGUIT de forma nativa. Docker se conservará durante el piloto como referencia y camino de recuperación hasta que la alternativa nativa demuestre estabilidad.

### Arquitectura nativa propuesta

- PostgreSQL 17 instalado como servicio del sistema.
- Node.js 22 LTS instalado y fijado a una versión aprobada.
- Backend compilado a JavaScript y ejecutado como servicio:
  - Linux: `systemd`;
  - Windows Server: WinSW o servicio equivalente aprobado por IT.
- Frontend compilado a archivos estáticos y servido por:
  - IIS/Caddy en Windows; o
  - nginx/Caddy en Linux.
- Proxy inverso único para `/api` y `/uploads`.
- HTTPS obligatorio, incluso si la aplicación es interna.
- Base, uploads, logs y aplicación en directorios separados con permisos mínimos.
- Cuenta de servicio sin privilegios administrativos.

### Trabajo

1. Confirmar sistema operativo y restricciones corporativas.
2. Preparar scripts idempotentes de instalación, actualización y rollback.
3. Definir manejo seguro de secretos fuera del repositorio.
4. Ejecutar migraciones como paso controlado de release, no de forma opaca durante cada inicio.
5. Añadir arranque ordenado, graceful shutdown y comprobación real de PostgreSQL.
6. Configurar rotación y retención de logs.
7. Configurar firewall, TLS, DNS y acceso únicamente desde las redes necesarias.
8. Programar backups:
   - backup lógico de PostgreSQL;
   - backup de uploads;
   - copia fuera del servidor;
   - cifrado y retención;
   - alerta ante fallos.
9. Realizar y documentar un ejercicio de restauración completo.
10. Ejecutar pruebas de carga simples sobre búsquedas, dashboard, historial y carga de imágenes.
11. Mantener un paquete Docker actualizado como contingencia hasta superar el período de estabilización.

### Salida de fase

- Instalación nativa reproducida desde cero en preproducción.
- Reinicio del servidor recupera todos los servicios automáticamente.
- Health checks verifican aplicación y base de datos de verdad.
- Backup y restore completos demostrados.
- Actualización y rollback ensayados.
- Rendimiento aceptable con el volumen actual y concurrencia esperada.

**Estimación preliminar:** 1 a 2 semanas después de elegir el servidor objetivo.

---

## Fase 5 — Preproducción, aceptación y corte

**Objetivo:** comprobar la versión final con datos representativos y preparar una salida reversible.

### Ensayo general

- Restaurar una copia controlada de datos en preproducción.
- Aplicar exactamente el runbook previsto para producción.
- Ejecutar migraciones y reporte de integridad.
- Ejecutar suite automatizada completa.
- Realizar UAT con al menos un administrador y técnicos reales.
- Medir tiempos de login, búsqueda, dashboard, historial y movimientos.
- Validar navegador, resolución, impresiones/exportaciones que el trabajo necesite.
- Confirmar usuarios, roles y jerarquía de ubicaciones.

### Runbook de corte

1. Comunicar ventana y responsables.
2. Congelar escritura en el sistema anterior si continúa en uso.
3. Tomar backup final de base y uploads.
4. Registrar totales de control.
5. Desplegar versión aprobada.
6. Aplicar migraciones controladas.
7. Restaurar/importar datos definitivos si corresponde.
8. Ejecutar chequeo de integridad y smoke test.
9. Habilitar usuarios de forma escalonada.
10. Observar métricas y logs durante la ventana acordada.

### Criterio de rollback

Volver a la versión y backup anteriores si ocurre cualquiera de estos casos durante la ventana:

- pérdida o duplicación de datos;
- imposibilidad general de iniciar sesión;
- préstamos, movimientos o historial inconsistentes;
- errores sostenidos de servidor;
- degradación que impida el trabajo normal;
- backup final no verificable.

### Salida de fase

- UAT firmada o aprobada por escrito.
- Checklist de producción completo.
- Runbook ejecutado al menos una vez en preproducción.
- Responsables y canales de soporte informados.
- Decisión formal GO/NO-GO.

**Estimación preliminar:** 3 a 5 días más la ventana de corte.

---

## Fase 6 — Puesta en marcha y estabilización

**Objetivo:** introducir el sistema de forma controlada y corregir rápidamente problemas reales.

### Primeras 48 horas

- Seguimiento cercano de errores, memoria, disco, base, latencia y backups.
- Revisión de logins fallidos y errores 4xx/5xx.
- Verificación diaria de préstamos, movimientos e historial.
- Canal único para reportar incidentes con prioridad e impacto.
- Ninguna mejora grande durante esta ventana salvo corrección urgente.

### Primeras 2 a 4 semanas

- Revisión semanal de integridad.
- Confirmación periódica de backups y una nueva restauración de muestra.
- Priorización de feedback de técnicos.
- Cierre documentado de defectos y actualización de manuales.
- Retiro de la contingencia anterior únicamente después de la aceptación del período estable.

### Salida de fase

- Operación estable durante el período acordado.
- Sin incidentes P0/P1 abiertos.
- Backups continuos verificados.
- Soporte operativo transferido a sus responsables permanentes.

---

## Fase 7 — Evolución posterior

Una vez estabilizado el núcleo, se propone este orden:

1. Importación y exportación CSV/Excel con validación previa.
2. Alertas por garantías, licencias, reparaciones y préstamos demorados.
3. Mejoras de dashboard basadas en necesidades reales de los usuarios.
4. Automatizaciones y notificaciones configurables.
5. Reportes de inventario, trazabilidad y auditoría.
6. Mejoras de accesibilidad y operación móvil.
7. Integración con directorio corporativo o SSO, si infraestructura lo permite.
8. Política de ciclo de vida, obsolescencia, costos y bajas.

Estas mejoras no deben mezclarse con los bloqueos de producción salvo que resuelvan directamente una necesidad del corte inicial.

---

## 5. Matriz mínima de QA funcional

| Área | Casos indispensables |
|---|---|
| Autenticación | login válido/inválido, rate limit, refresh, logout, expiración y cambio obligatorio |
| Usuarios | alta, edición, reset, cambio de rol, ficha duplicada y permisos |
| Equipos | alta, edición, búsqueda, filtros, paginación, serie duplicada y detalle |
| Ubicaciones | CRUD, movimiento individual/masivo, restricciones y auditoría |
| Préstamos | préstamo, duplicado, devolución, concurrencia y coherencia del estado |
| Soporte/servicio | envío, retorno, fechas, proveedor e historial |
| Licencias | alta, edición, asociación, vencimiento, filtros y resumen |
| Plantillas | CRUD, asignación compatible, edición y eliminación en uso |
| Imágenes | tipo/tamaño válidos, rechazo de contenido inválido, permisos y backup |
| Dashboard | totales reconciliados, fechas válidas, filtros y enlaces |
| Historial | actor, acción, origen, destino, orden, filtros e inmutabilidad |
| Carga masiva | éxito, validación, duplicados, fallo intermedio y atomicidad |
| Operación | reinicio, migración, health check, backup, restore, actualización y rollback |

---

## 6. Indicadores para decidir si está pronta

Antes del GO deben cumplirse todos:

- 0 defectos P0 abiertos.
- 0 defectos P1 sin aceptación formal y mitigación.
- 100 % de builds, lint y suites críticas en verde.
- 0 préstamos activos duplicados.
- 0 usuarios con credenciales conocidas o compartidas.
- 100 % de ciudades/secciones/oficinas necesarias validadas por negocio.
- Totales de equipos e historial reconciliados contra la fuente acordada.
- Backup automático exitoso y restauración demostrada.
- Despliegue y rollback ejecutados en preproducción.
- UAT aprobada.
- HTTPS, firewall, logs y monitoreo activos.

---

## 7. Orden práctico de ejecución

Para evitar que el plan se convierta en un documento inmanejable, cada fase se dividirá en tickets pequeños y verificables. El siguiente bloque no empieza hasta que el anterior tenga evidencia suficiente:

1. Preservación y decisiones.
2. Build, secretos, cuentas y préstamos.
3. Defectos críticos y subida de archivos.
4. Movimiento y organización de ubicaciones.
5. QA automatizado y regresiones.
6. Piloto nativo y operación.
7. Preproducción y UAT.
8. Corte y estabilización.
9. Mejoras posteriores.

**Duración global preliminar para una persona:** aproximadamente 6 a 10 semanas, dependiendo de la disponibilidad del servidor, la velocidad de validación de datos y el alcance final de las pruebas. No es una fecha compromiso; se recalculará al desglosar y estimar los tickets de la primera fase.

---

## 8. Próximo paso inmediato

El siguiente trabajo no es comenzar a cambiar código al azar. Es cerrar la Fase 0 y transformar la Fase 1 en un backlog ejecutable, con un ticket por problema, evidencia de reproducción, archivos afectados, prueba esperada, riesgo y criterio de aceptación.

En paralelo se debe especificar la pantalla de reorganización de ubicaciones con la persona que hará la carga manual, porque ese flujo condiciona la preparación de los datos productivos.
