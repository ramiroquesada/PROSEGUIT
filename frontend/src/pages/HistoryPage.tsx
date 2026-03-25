import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useHistory } from '../hooks/useHistory';
import styles from './HistoryPage.module.css';
import { usePageTitle } from '../hooks/usePageTitle';

const ACCION_OPTIONS = [
  { value: '', label: 'Todas las acciones' },
  { value: 'CREACION', label: 'Creación' },
  { value: 'EDICION', label: 'Edición' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'ENVIO_SOPORTE', label: 'Envío a Soporte' },
  { value: 'RETORNO_SOPORTE', label: 'Retorno de Soporte' },
  { value: 'ENVIO_SERVICIO_EXTERNO', label: 'Envío a Servicio Externo' },
  { value: 'RETORNO_SERVICIO_EXTERNO', label: 'Retorno de Servicio' },
  { value: 'PRESTAMO', label: 'Préstamo' },
  { value: 'DEVOLUCION', label: 'Devolución' },
  { value: 'BAJA', label: 'Baja' },
  { value: 'CAMBIO_ESTADO', label: 'Cambio de Estado' },
];

const ACCION_COLOR: Record<string, string> = {
  CREACION: 'success', EDICION: 'info', TRANSFERENCIA: 'primary',
  ENVIO_SOPORTE: 'warning', RETORNO_SOPORTE: 'success',
  ENVIO_SERVICIO_EXTERNO: 'warning', RETORNO_SERVICIO_EXTERNO: 'success',
  PRESTAMO: 'info', DEVOLUCION: 'success', BAJA: 'danger', CAMBIO_ESTADO: 'neutral',
};

export default function HistoryPage() {
  usePageTitle('Historial');
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    accion: '', search: '', desde: '', hasta: '',
  });

  const { data, isLoading } = useHistory({
    page,
    limit: 30,
    accion: filters.accion || undefined,
    search: filters.search || undefined,
  });

  function handleFilter(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setPage(1);
  }

  function handleClear() {
    setFilters({ accion: '', search: '', desde: '', hasta: '' });
    setPage(1);
  }

  const hasFilters = filters.accion || filters.search || filters.desde || filters.hasta;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.pageTitle}>Historial Global</h2>
          {data && (
            <p className={styles.subtitle}>{data.pagination.total.toLocaleString('es-UY')} registros en total</p>
          )}
        </div>
      </div>

      {/* ── Filtros ─────────────────────────────────────────────────── */}
      <div className={styles.filtersBar}>
        <input
          type="text"
          name="search"
          value={filters.search}
          onChange={handleFilter}
          placeholder="Buscar por serie, motivo..."
          className={styles.searchInput}
        />

        <select name="accion" value={filters.accion} onChange={handleFilter} className={styles.select}>
          {ACCION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <div className={styles.dateRange}>
          <input type="date" name="desde" value={filters.desde} onChange={handleFilter} className={styles.dateInput} title="Desde" />
          <span className={styles.dateSep}>—</span>
          <input type="date" name="hasta" value={filters.hasta} onChange={handleFilter} className={styles.dateInput} title="Hasta" />
        </div>

        {hasFilters && (
          <button className={styles.clearBtn} onClick={handleClear}>Limpiar</button>
        )}
      </div>

      {/* ── Tabla ───────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className={styles.loading}>Cargando historial...</div>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Acción</th>
                  <th>Equipo</th>
                  <th>Motivo</th>
                  <th>Ubicación</th>
                  <th>Técnico</th>
                </tr>
              </thead>
              <tbody>
                {data?.data.map((entry) => (
                  <tr
                    key={entry.id}
                    className={styles.row}
                    onClick={() => entry.equipo && navigate(`/equipos/${entry.equipo.id}`)}
                    data-clickable={Boolean(entry.equipo)}
                  >
                    <td className={styles.fecha}>
                      {new Date(entry.fecha).toLocaleDateString('es-UY', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td>
                      <span className={styles.accionBadge} data-color={ACCION_COLOR[entry.accion] || 'neutral'}>
                        {ACCION_OPTIONS.find((o) => o.value === entry.accion)?.label || entry.accion}
                      </span>
                    </td>
                    <td>
                      {entry.equipo ? (
                        <span className={styles.equipoCell}>
                          <span className={styles.serie}>Serie {entry.equipo.serie}</span>
                          {entry.equipo.modelo && <span className={styles.modelo}>{entry.equipo.modelo}</span>}
                        </span>
                      ) : <span className={styles.muted}>—</span>}
                    </td>
                    <td className={styles.motivoCell}>{entry.motivo}</td>
                    <td>
                      <div className={styles.ubicacionCell}>
                        {entry.oficinaOrigen && (
                          <div className={styles.ubicRow}>
                            <span className={styles.ubicLabel}>De</span>
                            <span className={styles.ubicTag}>{entry.oficinaOrigen.nombre}</span>
                          </div>
                        )}
                        {entry.oficinaDestino && (
                          <div className={styles.ubicRow}>
                            <span className={styles.ubicLabel}>A</span>
                            <span className={styles.ubicTag}>{entry.oficinaDestino.nombre}</span>
                          </div>
                        )}
                        {!entry.oficinaOrigen && !entry.oficinaDestino && (
                          <span className={styles.muted}>—</span>
                        )}
                      </div>
                    </td>
                    <td className={styles.tecnico}>{entry.usuario.nombre}</td>
                  </tr>
                ))}
                {data?.data.length === 0 && (
                  <tr><td colSpan={6} className={styles.empty}>No hay registros con los filtros aplicados</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {data && data.pagination.totalPages > 1 && (
            <div className={styles.pagination}>
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={styles.pageBtn}>← Anterior</button>
              <span className={styles.pageInfo}>
                Página {data.pagination.page} de {data.pagination.totalPages}
              </span>
              <button disabled={page >= data.pagination.totalPages} onClick={() => setPage((p) => p + 1)} className={styles.pageBtn}>Siguiente →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
