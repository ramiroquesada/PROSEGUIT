# Movimiento individual de oficinas

## Objetivo

Permitir reorganizar la jerarquía Ciudad → Sección → Oficina sin crear secciones momentáneas ni reasignar equipos uno por uno.

## Flujo de uso

1. En **Ubicaciones**, seleccionar una ciudad y una sección para ver sus oficinas.
2. Usar la acción **Mover oficina** de la oficina deseada.
3. Revisar la ruta actual y la cantidad de equipos afectados.
4. Elegir cualquier ciudad y sección destino.
5. Si la ciudad todavía no tiene la sección real, crearla dentro del mismo diálogo y dejarla seleccionada.
6. Agregar opcionalmente un motivo o referencia y confirmar con **Mover oficina**.

Los equipos mantienen su `oficinaId`: al moverse la oficina, todos aparecen automáticamente bajo la nueva ruta jerárquica.

## Garantías técnicas

- Solo un administrador puede consultar el impacto o ejecutar el movimiento.
- El backend bloquea movimientos simultáneos de la misma oficina.
- El cambio de sección y la entrada de auditoría ocurren en una única transacción.
- La auditoría conserva nombres e identificadores de origen y destino, usuario, fecha, motivo y cantidad de equipos.
- Un conflicto de nombre en la sección destino rechaza toda la operación con `409`.
- No se permite elegir la misma sección actual.
- El arrastre existente reutiliza el mismo endpoint transaccional y queda auditado también.

## Pendiente

La reorganización masiva con búsqueda, selección múltiple, cambios pendientes, vista previa global y aplicación atómica corresponde a `UBI-05` a `UBI-08`.
