import { useState } from 'react';
import { useLoans, useReturnLoan } from '../hooks/useLoans';
import { useLocationTree } from '../hooks/useLocations';
import styles from './LoansPage.module.css';

export default function LoansPage() {
  const [page, setPage] = useState(1);
  const [activo, setActivo] = useState<boolean | undefined>(true);
  const [showReturnModal, setShowReturnModal] = useState<number | null>(null);
  const [devueltoPorFicha, setDevueltoPorFicha] = useState('');
  const [returnError, setReturnError] = useState('');

  const { data, isLoading } = useLoans({ page, limit: 20, activo });
  const returnMutation = useReturnLoan();

  async function handleReturn() {
    if (!showReturnModal) return;
    const ficha = Number(devueltoPorFicha);
    if (!ficha) { setReturnError('Ingresá la ficha del funcionario'); return; }

    try {
      await returnMutation.mutateAsync({ id: showReturnModal, devueltoPorFicha: ficha });
      setShowReturnModal(null);
      setDevueltoPorFicha('');
      setReturnError('');
    } catch (e: any) {
      setReturnError(e?.message || 'Error al registrar devolución');
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <h2 className={styles.pageTitle}>Préstamos</h2>

        <div className={styles.filters}>
          <button
            className={styles.filterBtn}
            data-active={activo === true}
            onClick={() => { setActivo(true); setPage(1); }}
          >
            Activos
          </button>
          <button
            className={styles.filterBtn}
            data-active={activo === false}
            onClick={() => { setActivo(false); setPage(1); }}
          >
            Devueltos
          </button>
          <button
            className={styles.filterBtn}
            data-active={activo === undefined}
            onClick={() => { setActivo(undefined); setPage(1); }}
          >
            Todos
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className={styles.loading}>Cargando préstamos...</div>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Equipo</th>
                  <th>Solicitante</th>
                  <th>Destino</th>
                  <th>Técnico</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data?.data.map((p) => (
                  <tr key={p.id} className={styles.row}>
                    <td>
                      <span className={styles.serie}>Serie {p.equipo.serie}</span>
                      {p.equipo.modelo && <span className={styles.modelo}>{p.equipo.modelo}</span>}
                      <span className={styles.tipo}>{p.equipo.tipoEquipo.nombre}</span>
                    </td>
                    <td>
                      {p.solicitante
                        ? <span>{p.solicitante.nombre}<br /><small>Ficha {p.solicitante.ficha}</small></span>
                        : <span className={styles.muted}>—</span>}
                    </td>
                    <td>{p.oficinaDestino?.nombre || '—'}</td>
                    <td>{p.tecnico.nombre}</td>
                    <td className={styles.fecha}>
                      {new Date(p.fechaPrestamo).toLocaleDateString('es-UY')}
                      {p.fechaDevolucion && (
                        <span className={styles.devolucion}>
                          Dev: {new Date(p.fechaDevolucion).toLocaleDateString('es-UY')}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={styles.badge} data-active={p.activo}>
                        {p.activo ? 'Activo' : 'Devuelto'}
                      </span>
                    </td>
                    <td>
                      {p.activo && (
                        <button
                          className={styles.returnBtn}
                          onClick={() => { setShowReturnModal(p.id); setReturnError(''); setDevueltoPorFicha(''); }}
                        >
                          Registrar devolución
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {data?.data.length === 0 && (
                  <tr>
                    <td colSpan={7} className={styles.empty}>No hay préstamos</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {data && data.pagination.totalPages > 1 && (
            <div className={styles.pagination}>
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={styles.pageBtn}>
                Anterior
              </button>
              <span className={styles.pageInfo}>
                Página {data.pagination.page} de {data.pagination.totalPages} ({data.pagination.total} préstamos)
              </span>
              <button disabled={page >= data.pagination.totalPages} onClick={() => setPage((p) => p + 1)} className={styles.pageBtn}>
                Siguiente
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal devolución */}
      {showReturnModal && (
        <div className={styles.overlay} onClick={() => setShowReturnModal(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Registrar Devolución</h3>
            {returnError && <p className={styles.modalError}>{returnError}</p>}
            <div className={styles.field}>
              <label className={styles.label}>Ficha del funcionario que devuelve</label>
              <input
                type="number"
                value={devueltoPorFicha}
                onChange={(e) => setDevueltoPorFicha(e.target.value)}
                className={styles.input}
                placeholder="Ficha..."
                autoFocus
              />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowReturnModal(null)}>
                Cancelar
              </button>
              <button className={styles.confirmBtn} onClick={handleReturn} disabled={returnMutation.isPending}>
                {returnMutation.isPending ? 'Guardando...' : 'Confirmar devolución'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
