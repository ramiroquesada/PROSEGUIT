# Historial de versiones

Todos los cambios relevantes de PROSEGUIT se documentan en este archivo. El proyecto usa versionado semántico (`MAJOR.MINOR.PATCH`).

## [2.1.0] - 2026-09-08

### Agregado

- Separación entre la oficina a la que pertenece un equipo y su ubicación actual.
- Flujo de ENTRADA a Mantenimiento y SALIDA hacia la oficina asignada.
- Cambio directo de oficina, sección o ciudad sin crear ubicaciones temporales.
- Registro repetible de ejecuciones y anomalías al importar datos de SEGUIT v1.
- Versión instalada visible en la barra lateral, en el ingreso y en `/api/v1/health`.
- Validación automática para impedir releases con versiones diferentes entre los componentes.

### Corregido

- Operaciones de préstamo y devolución atómicas ante concurrencia.
- Conteos y fechas del dashboard cuando existían préstamos duplicados.
- Cadena de migraciones desde cero para los metadatos de imágenes de equipos.
- Creación segura de la oficina lógica Mantenimiento sin mover datos existentes.

### Notas de actualización

- Las migraciones de esquema son aditivas y se aplican al iniciar el backend en el despliegue Docker actual.
- Antes del corte definitivo se debe respaldar producción y repetir la importación desde un dump final de SEGUIT v1.
- La base de desarrollo no es la fuente definitiva para producción.
