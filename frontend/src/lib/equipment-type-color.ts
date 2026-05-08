/**
 * Mapeo explícito de tipo de equipo → color key.
 * Los tipos no listados reciben `slate` como fallback.
 */
const TYPE_COLOR_MAP: Record<string, string> = {
  // Computación (sky = azul claro)
  'PC - Torre': 'sky',
  'PC - LapTop': 'sky',
  Tablet: 'sky',

  // Pantallas (indigo = azul violáceo, se distingue del sky)
  Monitor: 'indigo',

  // Impresión (fuchsia = magenta)
  Impresora: 'fuchsia',
  Fotocopiadora: 'fuchsia',

  // Red (emerald = verde)
  Switch: 'emerald',
  'Switch Raqueable': 'emerald',
  Router: 'emerald',
  Modem: 'emerald',
  'Patchera Rackeable': 'emerald',
  'PoE adapter': 'emerald',

  // Cámaras / video-vigilancia (rose = rosado)
  'Camara CVI': 'rose',
  'Camara IP': 'rose',
  'Camara Web': 'rose',
  Antena: 'rose',
  'Antena WiFi USB': 'rose',

  // DVR / grabadores (orange = naranja)
  DVR: 'orange',
  NVR: 'orange',
  XVR: 'orange',
  'Gabinete CCTV': 'orange',

  // Telefonía (amber = ámbar)
  'Telefonos IP': 'amber',
  Celular: 'amber',
  'Base de telefono': 'amber',
  Reloj: 'amber',

  // Energía (violet = púrpura)
  UPS: 'violet',
  'Bateria UPS': 'violet',
  'Alargues y zapatillas': 'violet',

  // Almacenamiento (cyan = cian)
  SSD: 'cyan',
  'Disco Externo': 'cyan',

  // Audio (lime = verde lima)
  'Kit Parlantes': 'lime',
  Auriculares: 'lime',

  // Periféricos (coral = salmón)
  'Lector Cod-Barras': 'coral',

  // Miscelánea (slate = gris azulado)
  'Caja Conexion': 'slate',
  Rack: 'slate',
};

/** Color de fallback para tipos no mapeados explícitamente */
const FALLBACK_COLOR = 'slate';

/**
 * Retorna el color key para un tipo de equipo dado su nombre.
 * Usa mapeo explícito para los 35 tipos conocidos; fallback a `slate` para nuevos.
 */
export function getTypeColor(typeName: string): string {
  return TYPE_COLOR_MAP[typeName] ?? FALLBACK_COLOR;
}
