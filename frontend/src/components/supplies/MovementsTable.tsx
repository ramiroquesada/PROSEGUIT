import { Link } from 'react-router';
import type { MovimientoInsumo } from '../../hooks/useSupplies';
import { MOVIMIENTO_LABEL, MOVIMIENTO_TONE, formatFecha } from '../../lib/supply-movements';
import styles from './supplies.module.css';

interface Props {
  movimientos: MovimientoInsumo[];
  /** Muestra la columna del insumo (registro global). */
  conInsumo?: boolean;
}

function destino(m: MovimientoInsumo) {
  const partes: React.ReactNode[] = [];
  if (m.oficina) partes.push(<span key="o">{m.oficina.nombre}<span className={styles.sub}>{m.oficina.seccion.nombre}</span></span>);
  if (m.recibe) partes.push(<span key="r" className={styles.sub}>Recibe: {m.recibe}</span>);
  if (m.equipo) {
    partes.push(
      <span key="e" className={styles.sub}>
        Equipo <Link className={styles.link} to={`/equipos/${m.equipo.id}`} onClick={(e) => e.stopPropagation()}>{m.equipo.serie}</Link>
      </span>,
    );
  }
  return partes.length ? partes : <span className={styles.muted}>—</span>;
}

export default function MovementsTable({ movimientos, conInsumo }: Props) {
  return (
    <div className={styles.tableWrapper}>
      <table className={`${styles.table} ${styles.movementsTable}`}>
        <thead>
          <tr>
            <th>Fecha</th>
            {conInsumo && <th>Insumo</th>}
            <th>Tipo</th>
            <th style={{ textAlign: 'right' }}>Cantidad</th>
            <th style={{ textAlign: 'right' }}>Quedó</th>
            <th>Destino</th>
            <th>Motivo</th>
            <th>Usuario</th>
          </tr>
        </thead>
        <tbody>
          {movimientos.map((m) => (
            <tr key={m.id}>
              <td>{formatFecha(m.fecha)}</td>
              {conInsumo && (
                <td><Link className={styles.link} to={`/insumos/${m.insumo.id}`}>{m.insumo.nombre}</Link></td>
              )}
              <td><span className={styles.pill} data-tone={MOVIMIENTO_TONE[m.tipo]}>{MOVIMIENTO_LABEL[m.tipo]}</span></td>
              <td className={styles.num} data-sign={m.cantidad > 0 ? 'plus' : 'minus'}>
                {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}
              </td>
              <td className={styles.num}>{m.stockResultante}</td>
              <td>{destino(m)}</td>
              <td data-wrap="true">{m.motivo || <span className={styles.muted}>—</span>}</td>
              <td>{m.usuario.nombre}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
