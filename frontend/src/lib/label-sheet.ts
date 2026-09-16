/**
 * Geometría de las hojas A4 de etiquetas autoadhesivas de 33 unidades.
 *
 * Reemplaza al .ods "Codigos Pre Impresos - 33 Etiquetas", que tenía la grilla
 * armada a mano con alturas de fila desparejas (0,499 / 0,529 / 0,55 cm) y se
 * iba corriendo hasta ~2,5 mm respecto de una grilla pareja. Acá la grilla es
 * uniforme y el desvío del printer se corrige con los offsets de calibración.
 */

export interface SheetFormat {
  id: string;
  label: string;
  /** Ancho de cada etiqueta, en mm. */
  labelWidthMm: number;
  /** Alto de cada etiqueta, en mm. */
  labelHeightMm: number;
  /** Separación horizontal entre etiquetas, en mm. */
  gapXMm: number;
  /** Separación vertical entre etiquetas, en mm. */
  gapYMm: number;
  /** Margen izquierdo de la hoja hasta la primera etiqueta, en mm. */
  marginLeftMm: number;
  /** Margen superior de la hoja hasta la primera etiqueta, en mm. */
  marginTopMm: number;
  columns: number;
  rows: number;
}

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

export const SHEET_FORMATS: SheetFormat[] = [
  {
    id: '63x25',
    label: '63,5 × 25,4 mm — 3 × 11 (el que usamos)',
    labelWidthMm: 63.5,
    labelHeightMm: 25.4,
    gapXMm: 2.5,
    gapYMm: 0,
    marginLeftMm: 7.25,
    marginTopMm: 8.8,
    columns: 3,
    rows: 11,
  },
  {
    id: '70x25',
    label: '70 × 25,4 mm — 3 × 11 (sin márgenes laterales)',
    labelWidthMm: 70,
    labelHeightMm: 25.4,
    gapXMm: 0,
    gapYMm: 0,
    marginLeftMm: 0,
    marginTopMm: 8.8,
    columns: 3,
    rows: 11,
  },
];

export const DEFAULT_FORMAT = SHEET_FORMATS[0];

export function getFormat(id: string): SheetFormat {
  return SHEET_FORMATS.find((f) => f.id === id) ?? DEFAULT_FORMAT;
}

export function labelsPerSheet(format: SheetFormat): number {
  return format.columns * format.rows;
}

/**
 * Posición de la etiqueta `slot` (0-based) dentro de la hoja.
 * `order` define si los números bajan por la columna izquierda antes de pasar
 * a la del medio ('column', como hacía el .ods) o si van de a filas ('row').
 */
export function slotPosition(
  slot: number,
  format: SheetFormat,
  order: 'column' | 'row',
): { leftMm: number; topMm: number } {
  const col = order === 'column' ? Math.floor(slot / format.rows) : slot % format.columns;
  const row = order === 'column' ? slot % format.rows : Math.floor(slot / format.columns);

  return {
    leftMm: format.marginLeftMm + col * (format.labelWidthMm + format.gapXMm),
    topMm: format.marginTopMm + row * (format.labelHeightMm + format.gapYMm),
  };
}

/** Rellena con ceros a la izquierda hasta `digits`. Si ya es más largo, lo deja. */
export function padCode(value: number | string, digits: number): string {
  const s = String(value);
  return s.length >= digits ? s : '0'.repeat(digits - s.length) + s;
}
