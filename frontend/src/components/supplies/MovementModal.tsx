import { useState } from 'react';
import { useSupplyMovement, type TipoMovimiento, type MovimientoInput } from '../../hooks/useSupplies';
import { formatCantidad } from '../../lib/supply-movements';
import LocationCascadeSelect, { type CascadeValue } from '../LocationCascadeSelect';
import styles from './supplies.module.css';

interface Props {
  insumo: { id: number; nombre: string; unidad: string; stock: number };
  tipo: TipoMovimiento;
  onClose: () => void;
}

const TITULO: Record<TipoMovimiento, string> = {
  INGRESO: 'Registrar ingreso',
  ENTREGA: 'Registrar entrega',
  AJUSTE: 'Ajustar por conteo',
};

const VACIO: CascadeValue = { ciudadId: '', seccionId: '', oficinaId: '' };

/** Modal único para ingresos, entregas y ajustes de un insumo. */
export default function MovementModal({ insumo, tipo, onClose }: Props) {
  const mutation = useSupplyMovement();
  const [cantidad, setCantidad] = useState(tipo === 'AJUSTE' ? String(insumo.stock) : '1');
  const [ubicacion, setUbicacion] = useState<CascadeValue>(VACIO);
  const [recibe, setRecibe] = useState('');
  const [equipoSerie, setEquipoSerie] = useState('');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');

  const n = Number(cantidad);
  const valido = Number.isInteger(n) && (tipo === 'AJUSTE' ? n >= 0 : n > 0);
  const resultante = !valido ? null : tipo === 'INGRESO' ? insumo.stock + n : tipo === 'ENTREGA' ? insumo.stock - n : n;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!valido) { setError(tipo === 'AJUSTE' ? 'Ingresá la cantidad contada' : 'La cantidad debe ser mayor a 0'); return; }
    if (tipo === 'ENTREGA' && n > insumo.stock) { setError(`No alcanza: hay ${formatCantidad(insumo.stock, insumo.unidad)}`); return; }
    if (tipo === 'AJUSTE' && !motivo.trim()) { setError('Indicá el motivo del ajuste'); return; }
    if (tipo === 'AJUSTE' && n === insumo.stock) { setError('El conteo coincide con el stock actual'); return; }

    let data: MovimientoInput;
    if (tipo === 'INGRESO') data = { tipo, cantidad: n, motivo: motivo.trim() || undefined };
    else if (tipo === 'AJUSTE') data = { tipo, stockReal: n, motivo: motivo.trim() };
    else {
      const serie = Number(equipoSerie);
      data = {
        tipo,
        cantidad: n,
        oficinaId: ubicacion.oficinaId ? Number(ubicacion.oficinaId) : undefined,
        equipoSerie: equipoSerie && Number.isInteger(serie) && serie > 0 ? serie : undefined,
        recibe: recibe.trim() || undefined,
        motivo: motivo.trim() || undefined,
      };
    }

    try {
      await mutation.mutateAsync({ id: insumo.id, ...data });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el movimiento');
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={TITULO[tipo]}>
        <h3 className={styles.modalTitle}>{TITULO[tipo]}</h3>
        <p className={styles.modalSubject}>
          <strong>{insumo.nombre}</strong> · hay {formatCantidad(insumo.stock, insumo.unidad)}
        </p>

        {error && <div className={styles.error}>{error}</div>}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="mov-cantidad">
              {tipo === 'AJUSTE' ? 'Cantidad contada *' : 'Cantidad *'}
            </label>
            <input
              id="mov-cantidad"
              type="number"
              min={tipo === 'AJUSTE' ? 0 : 1}
              step={1}
              className={styles.input}
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              autoFocus
            />
            {resultante !== null && (
              <span className={styles.hint} data-warn={resultante < 0}>
                Quedarán {formatCantidad(resultante, insumo.unidad)}
              </span>
            )}
          </div>

          {tipo === 'ENTREGA' && (
            <>
              <div className={styles.field}>
                <span className={styles.label}>Oficina (opcional)</span>
                <LocationCascadeSelect
                  value={ubicacion}
                  onChange={setUbicacion}
                  onError={setError}
                  excludeOfficeTypes={['MANTENIMIENTO', 'STOCK', 'DEPOSITO']}
                />
              </div>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="mov-recibe">Quién lo recibe</label>
                  <input id="mov-recibe" className={styles.input} value={recibe} maxLength={120}
                    onChange={(e) => setRecibe(e.target.value)} placeholder="Nombre o ficha" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="mov-serie">Para el equipo (serie)</label>
                  <input id="mov-serie" type="number" min={1} className={styles.input} value={equipoSerie}
                    onChange={(e) => setEquipoSerie(e.target.value)} placeholder="Ej: 1234" />
                </div>
              </div>
            </>
          )}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="mov-motivo">
              {tipo === 'AJUSTE' ? 'Motivo *' : tipo === 'INGRESO' ? 'Origen / detalle' : 'Motivo'}
            </label>
            <textarea
              id="mov-motivo"
              className={styles.textarea}
              rows={2}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder={tipo === 'INGRESO' ? 'Ej: Compra, orden 123' : tipo === 'AJUSTE' ? 'Ej: Conteo mensual' : 'Ej: Reemplazo de cable dañado'}
            />
          </div>

          <div className={styles.modalActions}>
            <button type="button" className={styles.btn} onClick={onClose}>Cancelar</button>
            <button type="submit" className={styles.btn} data-variant="primary" disabled={mutation.isPending}>
              {mutation.isPending ? 'Guardando...' : TITULO[tipo]}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
