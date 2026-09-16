import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useHistory } from '../hooks/useHistory';
import { ACCION_OPTIONS, ACCION_COLOR } from '../lib/action-types';
import TypeBadge from '../components/ui/TypeBadge';
import styles from './HistoryPage.module.css';
import { usePageTitle } from '../hooks/usePageTitle';

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
    desde: filters.desde || undefined,
    hasta: filters.hasta || undefined,
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
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Buscar</label>
          <input
            type="text"
            name="search"
            value={filters.search}
            onChange={handleFilter}
            placeholder="Serie, motivo, comentario..."
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Acción</label>
          <select name="accion" value={filters.accion} onChange={handleFilter} className={styles.select}>
            {ACCION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Desde</label>
          <input type="date" name="desde" value={filters.desde} onChange={handleFilter} className={styles.dateInput} />
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Hasta</label>
          <input type="date" name="hasta" value={filters.hasta} onChange={handleFilter} className={styles.dateInput} />
        </div>

        {hasFilters && (
          <button className={styles.clearBtn} onClick={handleClear}>Limpiar filtros</button>
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
                    <th>Fecha y hora</th>
                    <th>Acción</th>
                    <th>Equipo</th>
                    <th>Tipo</th>
                    <th>Motivo / Comentario</th>
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
                      <span className={styles.fechaDia}>
                        {new Date(entry.fecha).toLocaleDateString('es-UY', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </span>
                      <span className={styles.fechaHora}>
                        {new Date(entry.fecha).toLocaleTimeString('es-UY', {
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
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
                    <td>
                      {entry.equipo ? (
                        <TypeBadge label={entry.equipo.tipoEquipo.nombre} />
                      ) : <span className={styles.muted}>—</span>}
                    </td>
                    <td className={styles.motivoTd}>
                      <span className={styles.motivo}>{entry.motivo}</span>
                      {entry.comentario && (
                        <span className={styles.comentario}>{entry.comentario}</span>
                      )}
                    </td>
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
                    <td>
                      <span className={styles.tecnicoCell}>
                        <span className={styles.tecnicoNombre}>{entry.usuario.nombre}</span>
                        <span className={styles.tecnicoFicha}>#{entry.usuario.ficha}</span>
                      </span>
                    </td>
                  </tr>
                ))}
                {data?.data.length === 0 && (
                  <tr><td colSpan={7} className={styles.empty}>No hay registros con los filtros aplicados</td></tr>
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
