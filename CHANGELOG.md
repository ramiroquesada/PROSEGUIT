# Historial de versiones

Todos los cambios relevantes de PROSEGUIT se documentan en este archivo. El proyecto usa versionado semántico (`MAJOR.MINOR.PATCH`).

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
