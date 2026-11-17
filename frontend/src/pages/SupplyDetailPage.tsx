import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ChevronLeft, Plus, Minus, Scale, Pencil, Archive, ArchiveRestore } from 'lucide-react';
import { useSupply, useUpdateSupply, type TipoMovimiento } from '../hooks/useSupplies';
import { formatFecha, pluralUnidad } from '../lib/supply-movements';
import MovementModal from '../components/supplies/MovementModal';
import SupplyFormModal from '../components/supplies/SupplyFormModal';
import MovementsTable from '../components/supplies/MovementsTable';
import { usePageTitle } from '../hooks/usePageTitle';
import styles from '../components/supplies/supplies.module.css';
import own from './SupplyDetailPage.module.css';

export default function SupplyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: insumo, isLoading, isError } = useSupply(Number(id));
  const update = useUpdateSupply();
  usePageTitle(insumo ? insumo.nombre : 'Insumo');

  const [movimiento, setMovimiento] = useState<TipoMovimiento | null>(null);
  const [editar, setEditar] = useState(false);
  const [error, setError] = useState('');

  if (isLoading) return <div className={styles.empty}>Cargando insumo...</div>;
  if (isError || !insumo) {
    return (
      <div className={styles.empty}>
        No se encontró el insumo. <Link className={styles.link} to="/insumos">Volver a Insumos</Link>
      </div>
    );
  }

  async function cambiarEstado() {
    if (!insumo) return;
    if (insumo.activo && !confirm(`¿Dar de baja "${insumo.nombre}"? Deja de aparecer en el listado y no admite movimientos. Se puede reactivar.`)) return;
    setError('');
    try {
      await update.mutateAsync({ id: insumo.id, activo: !insumo.activo });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar');
    }
  }

  return (
    <div className={own.page}>
      <Link to="/insumos" className={own.back}><ChevronLeft size={14} /> Volver a Insumos</Link>

      <section className={own.hero}>
        <div className={own.identity}>
          <span className={own.category}>{insumo.categoria.nombre}</span>
          <h2 className={own.title}>
            {insumo.nombre}
            {!insumo.activo && <span className={own.badge}>Dado de baja</span>}
          </h2>
          {insumo.observacion && <p className={own.obs}>{insumo.observacion}</p>}
        </div>
        <div className={own.stockBox} data-empty={insumo.stock === 0}>
          <span className={own.stockValue}>{insumo.stock}</span>
          <span className={own.stockUnit}>{pluralUnidad(insumo.stock, insumo.unidad)} en stock</span>
        </div>
      </section>

      {error && <div className={styles.error}>{error}</div>}

      <div className={own.actions}>
        {insumo.activo && (
          <>
            <button className={styles.btn} data-variant="primary" onClick={() => setMovimiento('INGRESO')}><Plus size={15} /> Ingreso</button>
            <button className={styles.btn} disabled={insumo.stock === 0} onClick={() => setMovimiento('ENTREGA')}><Minus size={15} /> Entregar</button>
            <button className={styles.btn} onClick={() => setMovimiento('AJUSTE')}><Scale size={15} /> Ajustar por conteo</button>
          </>
        )}
        <span className={own.spacer} />
        <button className={styles.btn} onClick={() => setEditar(true)}><Pencil size={15} /> Editar</button>
        <button className={styles.btn} onClick={cambiarEstado} disabled={update.isPending}>
          {insumo.activo ? <><Archive size={15} /> Dar de baja</> : <><ArchiveRestore size={15} /> Reactivar</>}
        </button>
      </div>

      <section className={styles.panel}>
        <header className={own.panelHeader}>
          <h3>Movimientos</h3>
          <span className={styles.groupCount}>
            {insumo.movimientos.length === 100 ? 'Últimos 100 · ' : ''}
            Alta: {formatFecha(insumo.createdAt)}
          </span>
        </header>
        {insumo.movimientos.length === 0 ? (
          <p className={own.none}>Sin movimientos todavía.</p>
        ) : (
          <MovementsTable movimientos={insumo.movimientos} />
        )}
      </section>

      {movimiento && <MovementModal insumo={insumo} tipo={movimiento} onClose={() => setMovimiento(null)} />}
      {editar && <SupplyFormModal insumo={insumo} onClose={() => setEditar(false)} />}
    </div>
  );
}
