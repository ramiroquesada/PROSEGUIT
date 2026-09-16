# PROSEGUIT — Registro de ejecuciones y anomalías de migración

## Objetivo

Cada importación desde SEGUIT v1 debe poder reproducirse, auditarse y revisarse sin corregir silenciosamente la fuente ni depender de cambios manuales en una base temporal.

## Estructura

### Ejecución de migración

Cada corrida registra:

- identificador UUID;
- origen `SEGUIT_V1`;
- nombre del archivo fuente;
- huella SHA-256 del contenido;
- fecha declarada por la exportación;
- inicio y finalización;
- estado de la ejecución;
- resumen de totales y auditoría.

Estados usados inicialmente:

- `EN_PROCESO`;
- `COMPLETADA`;
- `COMPLETADA_CON_ANOMALIAS`;
- `FALLIDA`.

### Anomalía de migración

Cada grupo detectado registra:

- código estable;
- severidad;
- descripción;
- cantidad de registros afectados;
- muestra limitada sin contraseñas ni secretos;
- estado `A_REVISAR` o `INFORMATIVA`;
- espacio para resolución y fecha de cierre.

La anomalía referencia la ejecución que la generó. El mismo código puede aparecer en distintas corridas, permitiendo comparar ensayos con la migración definitiva.

## Comportamiento del importador

`migrate-v1.ts` realiza ahora esta secuencia:

1. Verifica conexión, schema y archivo fuente.
2. Calcula la huella SHA-256 de `export_datos_v1.json`.
3. Crea la ejecución con estado `EN_PROCESO`.
4. Importa los datos.
5. Registra también los elementos omitidos durante la conversión.
6. Ejecuta la auditoría de integridad sobre el resultado.
7. Guarda los grupos encontrados como anomalías.
8. Finaliza como `COMPLETADA` o `COMPLETADA_CON_ANOMALIAS`.
9. Si ocurre un error, conserva la ejecución como `FALLIDA`.

El comando vuelve a estar disponible mediante:

```bash
npm run migrate:v1
```

Este comando continúa siendo destructivo sobre la base indicada por `DATABASE_URL`; debe utilizarse únicamente sobre una base vacía o expresamente destinada al ensayo/importación.

## Evidencia del ensayo descartable

Se ejecutó la migración completa en una base temporal y luego se eliminó esa base.

- Huella de entrada: `d0d0296abe0cad6c5d01ae60fae31d67c9b746c302e11d71b7048c9426f3f356`.
- 1.303 equipos importados.
- 4.249 historiales importados.
- 43 préstamos importados.
- 9 grupos de anomalías registrados.

Además de los hallazgos de integridad ya conocidos, el proceso identificó:

- 27 historiales omitidos porque referencian series inexistentes en la exportación de equipos;
- una colisión de nombre que consolida dos ubicaciones de v1 en una oficina de v2.

Estos dos problemas antes aparecían únicamente como texto en la consola. Ahora quedan vinculados a la huella exacta del archivo que los produjo.

## Trabajo posterior

- Agregar pantalla ADMIN para consultar ejecuciones y anomalías.
- Permitir agregar una resolución sin editar los datos fuente desde esa pantalla.
- Comparar anomalías entre el ensayo y el dump final.
- Convertir correcciones inequívocas en reglas versionadas del importador.
- Exportar la cola de revisión para aceptación funcional.
