import { useState } from 'react';
import { useAccessLog, useAccessSummary } from '../hooks/useAccessLog';
import {
  EVENTO_ACCESO_LABEL, EVENTO_ACCESO_COLOR, EVENTO_ACCESO_OPTIONS, EVENTOS_FALLIDOS, describeUserAgent,
} from '../lib/access-events';
import styles from './AccessLogPage.module.css';
import { usePageTitle } from '../hooks/usePageTitle';

export default function AccessLogPage() {
  usePageTitle('Accesos');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ evento: '', ficha: '', desde: '', hasta: '' });

  const { data: summary } = useAccessSummary();
  const { data, isLoading } = useAccessLog({
    page,
    limit: 30,
    evento: filters.evento || undefined,
    ficha: filters.ficha || undefined,
    desde: filters.desde || undefined,
    hasta: filters.hasta || undefined,
  });

  function handleFilter(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setPage(1);
  }

  function handleClear() {
    setFilters({ evento: '', ficha: '', desde: '', hasta: '' });
    setPage(1);
  }

  const hasFilters = filters.evento || filters.ficha || filters.desde || filters.hasta;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.pageTitle}>Registro de accesos</h2>
          <p className={styles.subtitle}>
            Inicios de sesión, intentos fallidos y cambios de contraseña.
            Tras 5 intentos fallidos en 15 minutos la ficha se bloquea; resetear la clave la desbloquea.
          </p>
        </div>
      </div>

      {summary && (
        <div className={styles.summary}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryValue}>{summary.loginsOk}</div>
            <div className={styles.summaryLabel}>Inicios de sesión (24 h)</div>
          </div>
          <div className={styles.summaryCard} data-alert={summary.fallidos > 0}>
            <div className={styles.summaryValue}>{summary.fallidos}</div>
            <div className={styles.summaryLabel}>Intentos fallidos (24 h)</div>
          </div>
          <div className={styles.summaryCard} data-alert={summary.bloqueos > 0}>
            <div className={styles.summaryValue}>{summary.bloqueos}</div>
            <div className={styles.summaryLabel}>Intentos con cuenta bloqueada (24 h)</div>
          </div>
        </div>
      )}

      {/* ── Filtros ─────────────────────────────────────────────────── */}
      <div className={styles.filtersBar}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Ficha</label>
          <input
            type="number"
            name="ficha"
            value={filters.ficha}
            onChange={handleFilter}
            placeholder="Ej: 7844"
            className={styles.fichaInput}
          />
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Evento</label>
          <select name="evento" value={filters.evento} onChange={handleFilter} className={styles.select}>
            {EVENTO_ACCESO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
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
        <div className={styles.loading}>Cargando accesos...</div>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fecha y hora</th>
                  <th>Evento</th>
                  <th>Usuario</th>
                  <th>Realizado por</th>
                  <th>IP</th>
                  <th>Navegador</th>
                </tr>
              </thead>
              <tbody>
                {data?.data.map((entry) => (
                  <tr key={entry.id} className={styles.row} data-fallo={EVENTOS_FALLIDOS.has(entry.evento)}>
                    <td className={styles.fecha}>
                      <span className={styles.fechaDia}>
                        {new Date(entry.fecha).toLocaleDateString('es-UY', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      <span className={styles.fechaHora}>
                        {new Date(entry.fecha).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </td>
                    <td>
                      <span className={styles.accionBadge} data-color={EVENTO_ACCESO_COLOR[entry.evento] || 'neutral'}>
                        {EVENTO_ACCESO_LABEL[entry.evento] || entry.evento}
                      </span>
                    </td>
                    <td>
                      {entry.usuario ? (
                        <span className={styles.tecnicoCell}>
                          <span className={styles.tecnicoNombre}>{entry.usuario.nombre}</span>
                          <span className={styles.tecnicoFicha}>#{entry.usuario.ficha}</span>
                        </span>
                      ) : entry.ficha ? (
                        <span className={styles.muted}>Ficha #{entry.ficha}</span>
                      ) : <span className={styles.muted}>—</span>}
                    </td>
                    <td>
                      {entry.actor ? (
                        <span className={styles.tecnicoCell}>
                          <span className={styles.tecnicoNombre}>{entry.actor.nombre}</span>
                          <span className={styles.tecnicoFicha}>#{entry.actor.ficha}</span>
                        </span>
                      ) : <span className={styles.muted}>—</span>}
                    </td>
                    <td className={styles.ip}>{entry.ip || '—'}</td>
                    <td className={styles.navegador} title={entry.userAgent ?? undefined}>
                      {describeUserAgent(entry.userAgent)}
                    </td>
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
