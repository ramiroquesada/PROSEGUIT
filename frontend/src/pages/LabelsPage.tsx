import { useState, useEffect, useId } from 'react';
import { Printer, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { useNextSerie } from '../hooks/useEquipment';
import { usePageTitle } from '../hooks/usePageTitle';
import {
  SHEET_FORMATS,
  DEFAULT_FORMAT,
  getFormat,
  labelsPerSheet,
  slotPosition,
  padCode,
  A4_WIDTH_MM,
  A4_HEIGHT_MM,
} from '../lib/label-sheet';
import styles from './LabelsPage.module.css';

const STORAGE_KEY = 'proseguit:etiquetas:config';

interface LabelConfig {
  formatId: string;
  header: string;
  digits: number;
  /** Los `*` que envolvían al número en el Excel viejo. */
  asterisks: boolean;
  order: 'column' | 'row';
  offsetXMm: number;
  offsetYMm: number;
  showGuides: boolean;
}

const DEFAULT_CONFIG: LabelConfig = {
  formatId: DEFAULT_FORMAT.id,
  header: 'INFORMATICA - INTENDENCIA SORIANO',
  digits: 10,
  asterisks: true,
  order: 'column',
  offsetXMm: 0,
  offsetYMm: 0,
  showGuides: false,
};

function loadConfig(): LabelConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Partial<LabelConfig>) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function formatCode(numero: number, config: LabelConfig): string {
  const code = padCode(numero, config.digits);
  return config.asterisks ? `*${code}*` : code;
}

export default function LabelsPage() {
  usePageTitle('Etiquetas');
  const uid = useId();

  const { data: nextSerieData } = useNextSerie();

  const [config, setConfig] = useState<LabelConfig>(loadConfig);
  const [showCalibration, setShowCalibration] = useState(false);

  // null = el usuario todavía no lo tocó, así que se muestra el próximo libre.
  const [primerNumeroInput, setPrimerNumeroInput] = useState<string | null>(null);
  const [cantidad, setCantidad] = useState('33');
  const [desdeEtiqueta, setDesdeEtiqueta] = useState('1');

  const primerNumero = primerNumeroInput ?? (nextSerieData ? String(nextSerieData.nextSerie) : '');

  const format = getFormat(config.formatId);
  const perSheet = labelsPerSheet(format);

  // La configuración se guarda para no tener que recalibrar en cada impresión.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      /* modo privado o storage lleno: no es crítico */
    }
  }, [config]);

  function patch(changes: Partial<LabelConfig>) {
    setConfig((c) => ({ ...c, ...changes }));
  }

  const desde = parseInt(primerNumero, 10);
  const total = parseInt(cantidad, 10);
  const startSlot = parseInt(desdeEtiqueta, 10);

  const errors: string[] = [];
  if (!Number.isInteger(desde) || desde < 0) errors.push('El primer número tiene que ser un entero positivo.');
  if (!Number.isInteger(total) || total < 1) errors.push('La cantidad tiene que ser al menos 1.');
  else if (total > perSheet * 30) errors.push(`La cantidad no puede pasar de ${perSheet * 30} (30 hojas).`);
  if (!Number.isInteger(startSlot) || startSlot < 1 || startSlot > perSheet) {
    errors.push(`"Empezar en la etiqueta" tiene que estar entre 1 y ${perSheet}.`);
  }
  if (!Number.isInteger(config.digits) || config.digits < 1 || config.digits > 16) {
    errors.push('Los dígitos tienen que estar entre 1 y 16.');
  }
  const valid = errors.length === 0;

  // Reparto de los números en las hojas, respetando el hueco inicial.
  const sheets: { slot: number; numero: number }[][] = [];
  if (valid) {
    const offset = startSlot - 1;
    for (let i = 0; i < total; i++) {
      const globalSlot = offset + i;
      const page = Math.floor(globalSlot / perSheet);
      while (sheets.length <= page) sheets.push([]);
      sheets[page].push({ slot: globalSlot % perSheet, numero: desde + i });
    }
  }

  const ultimoNumero = valid ? desde + total - 1 : 0;

  return (
    <div className={styles.page}>
      <div className={styles.controls}>
        <div className={styles.header}>
          <h1 className={styles.title}>Etiquetas de equipos</h1>
          <button
            type="button"
            className={styles.printBtn}
            onClick={() => window.print()}
            disabled={!valid}
          >
            <Printer size={16} strokeWidth={2} />
            Imprimir
          </button>
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Números a imprimir</h2>

          <div className={styles.grid3}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${uid}-desde`}>Primer número</label>
              <input
                id={`${uid}-desde`}
                className={styles.input}
                type="number"
                min={0}
                value={primerNumero}
                onChange={(e) => setPrimerNumeroInput(e.target.value)}
              />
              {nextSerieData && (
                <span className={styles.hint}>
                  Próximo libre en el sistema: <strong>{nextSerieData.nextSerie}</strong>
                </span>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${uid}-cantidad`}>Cantidad</label>
              <input
                id={`${uid}-cantidad`}
                className={styles.input}
                type="number"
                min={1}
                max={perSheet * 30}
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
              />
              <span className={styles.hint}>{perSheet} por hoja</span>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${uid}-slot`}>Empezar en la etiqueta</label>
              <input
                id={`${uid}-slot`}
                className={styles.input}
                type="number"
                min={1}
                max={perSheet}
                value={desdeEtiqueta}
                onChange={(e) => setDesdeEtiqueta(e.target.value)}
              />
              <span className={styles.hint}>Para reusar una hoja empezada</span>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Formato de la etiqueta</h2>

          <div className={styles.grid2}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${uid}-header`}>Texto de encabezado</label>
              <input
                id={`${uid}-header`}
                className={styles.input}
                type="text"
                value={config.header}
                onChange={(e) => patch({ header: e.target.value })}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${uid}-formato`}>Hoja de etiquetas</label>
              <select
                id={`${uid}-formato`}
                className={styles.select}
                value={config.formatId}
                onChange={(e) => patch({ formatId: e.target.value })}
              >
                {SHEET_FORMATS.map((f) => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.grid3}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${uid}-digits`}>Dígitos del número</label>
              <input
                id={`${uid}-digits`}
                className={styles.input}
                type="number"
                min={1}
                max={16}
                value={config.digits}
                onChange={(e) => patch({ digits: parseInt(e.target.value, 10) })}
              />
              <span className={styles.hint}>Rellena con ceros a la izquierda</span>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${uid}-orden`}>Orden en la hoja</label>
              <select
                id={`${uid}-orden`}
                className={styles.select}
                value={config.order}
                onChange={(e) => patch({ order: e.target.value as 'column' | 'row' })}
              >
                <option value="column">Por columna (como el Excel)</option>
                <option value="row">Por fila</option>
              </select>
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Opciones</span>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={config.asterisks}
                  onChange={(e) => patch({ asterisks: e.target.checked })}
                />
                Entre asteriscos, como el Excel
              </label>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={config.showGuides}
                  onChange={(e) => patch({ showGuides: e.target.checked })}
                />
                Dibujar el borde de cada etiqueta
              </label>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <button
            type="button"
            className={styles.collapseBtn}
            onClick={() => setShowCalibration((v) => !v)}
          >
            <SlidersHorizontal size={15} strokeWidth={2} />
            Calibración de la impresora
            <span className={styles.collapseChevron}>{showCalibration ? '▾' : '▸'}</span>
          </button>

          {showCalibration && (
            <>
              <p className={styles.help}>
                Si la impresión sale corrida respecto de las etiquetas, tildá “Dibujar el borde de
                cada etiqueta”, imprimí una hoja en papel común y ponela contra la hoja de etiquetas
                a contraluz. Medí cuánto hay que mover el dibujo y cargá esos milímetros acá.
                Los valores quedan guardados en esta PC.
              </p>
              <div className={styles.grid3}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor={`${uid}-offx`}>Corrimiento horizontal (mm)</label>
                  <input
                    id={`${uid}-offx`}
                    className={styles.input}
                    type="number"
                    step="0.5"
                    value={config.offsetXMm}
                    onChange={(e) => patch({ offsetXMm: parseFloat(e.target.value) || 0 })}
                  />
                  <span className={styles.hint}>Positivo = hacia la derecha</span>
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor={`${uid}-offy`}>Corrimiento vertical (mm)</label>
                  <input
                    id={`${uid}-offy`}
                    className={styles.input}
                    type="number"
                    step="0.5"
                    value={config.offsetYMm}
                    onChange={(e) => patch({ offsetYMm: parseFloat(e.target.value) || 0 })}
                  />
                  <span className={styles.hint}>Positivo = hacia abajo</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.label}>&nbsp;</span>
                  <button
                    type="button"
                    className={styles.resetBtn}
                    onClick={() => patch({ offsetXMm: 0, offsetYMm: 0 })}
                  >
                    <RotateCcw size={14} strokeWidth={2} />
                    Volver a cero
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        {errors.length > 0 && (
          <div className={styles.errorBox}>
            {errors.map((e) => <div key={e}>{e}</div>)}
          </div>
        )}

        {valid && (
          <div className={styles.summary}>
            <strong>{total}</strong> {total === 1 ? 'etiqueta' : 'etiquetas'} ·{' '}
            <code>{formatCode(desde, config)}</code> → <code>{formatCode(ultimoNumero, config)}</code> ·{' '}
            <strong>{sheets.length}</strong> {sheets.length === 1 ? 'hoja' : 'hojas'} A4
            {nextSerieData && desde < nextSerieData.nextSerie && (
              <span className={styles.summaryWarn}>
                {' '}· ojo: el rango pisa números que ya existen en el sistema
              </span>
            )}
          </div>
        )}

        <p className={styles.printHint}>
          Al imprimir: papel A4, orientación vertical, escala <strong>100 %</strong> (no “ajustar a la página”)
          y márgenes en <strong>ninguno</strong>.
        </p>
      </div>

      {/* Lo único que sale por impresora */}
      <div className={styles.sheets}>
        {sheets.map((labels, sheetIndex) => (
          <div
            key={sheetIndex}
            className={styles.sheet}
            style={{ width: `${A4_WIDTH_MM}mm`, height: `${A4_HEIGHT_MM}mm` }}
          >
            {labels.map(({ slot, numero }) => {
              const pos = slotPosition(slot, format, config.order);
              return (
                <div
                  key={numero}
                  className={`${styles.sticker} ${config.showGuides ? styles.stickerGuide : ''}`}
                  style={{
                    left: `${pos.leftMm + config.offsetXMm}mm`,
                    top: `${pos.topMm + config.offsetYMm}mm`,
                    width: `${format.labelWidthMm}mm`,
                    height: `${format.labelHeightMm}mm`,
                  }}
                >
                  {config.header && <span className={styles.stickerHeader}>{config.header}</span>}
                  <span className={styles.stickerNumber}>{formatCode(numero, config)}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
