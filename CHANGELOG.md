# Historial de versiones

Todos los cambios relevantes de PROSEGUIT se documentan en este archivo. El proyecto usa versionado semántico (`MAJOR.MINOR.PATCH`).

## [2.4.0] - 2026-11-17

### Agregado

- Sección **Stock** (`/stock`): equipos disponibles por tipo, etapas *A revisar* / *Listo*, días en stock y garantía restante.
- Oficina de tipo `STOCK` ("Stock disponible") y estado derivado `DISPONIBLE`.
- Los equipos nuevos (individual y carga masiva) se crean siempre en Stock como Nuevo; ya no se pide ubicación.
- Asignación a una oficina directamente desde la ficha de un equipo en Stock.
- Un equipo usado que vuelve a Stock queda Disponible y *A revisar*; uno Nuevo que pasa por Mantenimiento sigue siendo Nuevo.
- Script de una sola vez `pasar-nuevos-a-stock` (vista previa y `--apply`) para los equipos Nuevo del flujo anterior.
- Botón **Pasar a stock** en la ficha: lleva el equipo a Stock en un paso desde una oficina, Mantenimiento o Depósito, sin ENTRADA/SALIDA.
- **Condición** del equipo (Bueno / Con detalles / Solo para repuestos): se carga al pasar a stock, al marcar listo o desde Editar, se ve en la ficha y en Stock, y se puede filtrar.
- Sección **Insumos** (`/insumos`) para lo que no tiene número de serie (cables, pilas, discos, periféricos...): catálogo abierto agrupado por categoría, con búsqueda, categorías editables, ingresos, entregas (a oficina, persona o equipo), ajustes por conteo, bajas y registro de movimientos.

### Corregido

- El estado mostrado se deriva del tipo de la oficina actual en lugar de su nombre.
- El dashboard ya no cuenta como activos a los equipos usados que están en Stock.

### Notas de actualización

- Cuatro migraciones aditivas (tipos, columnas nulas, la oficina Stock y las tablas de insumos con seis categorías iniciales); no mueven equipos existentes. Los equipos existentes quedan con condición "Sin definir".
- Después del deploy, correr la vista previa del script y aplicarlo sólo tras revisarla. Detalle en CLAUDE.md, "Ciclo de vida y Stock", punto 6.

## [2.3.0] - 2026-09-21

### Agregado

- Registro de accesos, en una tabla aparte del historial de equipos. Guarda inicios de sesión, contraseñas incorrectas, fichas inexistentes, intentos de usuarios inactivos o bloqueados, cierres de sesión, cambios y resets de contraseña, y cierres de sesión forzados. Cada registro lleva fecha, ficha, IP y navegador, y en los resets y cierres forzados también el administrador que lo hizo.
- Página `/accesos`, solo para administradores, con el resumen de las últimas 24 horas (inicios de sesión, intentos fallidos e intentos con la cuenta bloqueada) y la tabla filtrable por ficha, evento y fechas. Los intentos fallidos aparecen resaltados.
- Bloqueo por intentos fallidos: con 5 contraseñas incorrectas en 15 minutos la ficha queda bloqueada y el login lo avisa con los minutos que faltan. Se desbloquea sola al pasar ese tiempo, o al instante cuando un administrador resetea la contraseña.
- Columna "Último acceso" en Usuarios.
- Botón "Cerrar sesiones" en Usuarios, para sacar a un usuario de todos sus dispositivos. Queda afuera en 15 minutos como máximo, que es lo que dura el token de acceso.

### Notas de actualización

- La migración nueva es aditiva: crea la tabla `registro_acceso` y la columna `usuario.ultimo_acceso`, y se aplica al iniciar el backend en el despliegue Docker.
- La IP se toma de la cabecera `X-Real-IP` que ya envía nginx. En desarrollo, sin proxy, se ve la del equipo local.
- El registro empieza vacío: no hay accesos anteriores a esta versión, y "Último acceso" dice "Nunca" hasta el próximo login de cada usuario.

## [2.2.1] - 2026-09-16

### Corregido

- No se podía iniciar sesión en el despliegue: el backend rechazaba por CORS el origen del propio servidor y devolvía un 500. En producción no había forma de declarar un origen permitido, así que cualquier pedido con cabecera `Origin` quedaba rechazado. Afectaba solo a POST, PUT, PATCH y DELETE, porque el navegador manda `Origin` en esos métodos aunque el pedido sea del mismo origen; por eso fallaba el login y no la navegación.
- Un origen rechazado ya no se convierte en error 500. Antes se entregaba un `Error` al paquete de CORS, que lo derivaba al manejador de errores. Ahora simplemente no se agregan las cabeceras CORS y el bloqueo queda a cargo del navegador, que es a quien le corresponde.
- El backend reconoce por sí solo los pedidos del mismo origen comparando `Origin` contra `Host`, así que cambiar la IP o el dominio del servidor no requiere configurar nada.
- nginx reenvía el `Host` original con `$http_host` en lugar de `$host`, que descarta el puerto. Con un `HTTP_PORT` distinto de 80 el pedido del mismo origen no se reconocía.

### Agregado

- Variable opcional `CORS_ALLOWED_ORIGINS`, separada por comas, para el caso en que el frontend se sirva desde otro dominio. Con el despliegue Docker habitual se deja vacía.
- Pruebas de CORS, incluidas dos contra la aplicación real que reproducen el fallo del despliegue: contra el código anterior devuelven 500.

## [2.2.0] - 2026-09-16

### Agregado

- Página `/etiquetas` para imprimir las etiquetas numeradas que se pegan en los equipos, en hojas A4 de 33 (3 × 11, de 63,5 × 25,4 mm). Reemplaza a la planilla `Codigos Pre Impresos - 33 Etiquetas.ods`, que había que editar a mano en cada tirada.
- El rango arranca en el próximo número libre y avisa si pisa números ya existentes.
- Opción de empezar en una etiqueta intermedia, para terminar hojas a medio despegar.
- Calibración de corrimiento X/Y en milímetros y borde de etiqueta dibujable, para ajustar el desvío de la impresora. Queda guardada en el navegador.

### Corregido

- La página de licencias mostraba `PROSEGUIT` en la barra superior en lugar de su título, porque faltaba en el mapa de títulos.
- Faltaba en la cadena de migraciones el agregado de `FOTO_AGREGADA` y `FOTO_ELIMINADA` al enum `accion_tipo`, que ya estaban en el esquema y en el módulo de imágenes. Una base creada desde cero quedaba sin esos valores.

### Notas de actualización

- La migración nueva es aditiva e idempotente, y se aplica al iniciar el backend en el despliegue Docker.
- La impresión requiere papel A4 vertical, escala 100 % y márgenes en "ninguno". La primera vez conviene imprimir una hoja de prueba en papel común y compararla contra la hoja de etiquetas antes de gastar una.

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
