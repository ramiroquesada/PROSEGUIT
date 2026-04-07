import { readFileSync } from 'fs';
import { resolve } from 'path';

const dataPath = resolve('.', 'export_datos_v1.json');
const v1 = JSON.parse(readFileSync(dataPath, 'utf8'));

// Mapas de series
const equipoSeries = new Set(v1.equipo.map((e: any) => e.serie));
const historialhSeries = v1.historial.map((h: any) => h.serie);

// Encontrar series en historial que no existen en equipos
const seriesFaltantes = new Map<number, number>();
historialhSeries.forEach((serie: number) => {
  if (!equipoSeries.has(serie)) {
    seriesFaltantes.set(serie, (seriesFaltantes.get(serie) ?? 0) + 1);
  }
});

console.log(`\n=== Series de equipos referenciadas en historial pero NO encontradas ===\n`);
console.log(`Total: ${seriesFaltantes.size} series únicas faltantes (${[...seriesFaltantes.values()].reduce((a, b) => a + b, 0)} registros de historial)\n`);

if (seriesFaltantes.size > 0) {
  const sorted = Array.from(seriesFaltantes.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30); // Top 30

  console.log(`Top 30 series más referenciadas:\n`);
  sorted.forEach(([serie, count], i) => {
    console.log(`  ${(i + 1).toString().padStart(2)}. Serie ${serie.toString().padStart(4)} - ${count.toString().padStart(3)} registros de historial`);
  });
}

// Análisis de fechas de los registros omitidos
console.log(`\n=== Fechas de los registros de historial omitidos ===\n`);
const omitidos = v1.historial.filter((h: any) => !equipoSeries.has(h.serie));
const fechas = omitidos.map((h: any) => new Date(h.fecha).toISOString().split('T')[0]).sort();
console.log(`Primera: ${fechas[0]}`);
console.log(`Última:  ${fechas[fechas.length - 1]}`);
console.log(`Total:   ${fechas.length} registros`);
