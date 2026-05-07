import { type ReactNode } from 'react';
import styles from './DataTable.module.css';

export interface PaginationState {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  from: number;
  to: number;
}

interface DataTableProps {
  /** Column definitions: label y ancho opcional */
  columns: { key: string; label: string; className?: string }[];
  /** Filas de datos (el llamado renderiza celdas) */
  rows: ReactNode[];
  /** Estado de carga */
  loading?: boolean;
  /** Mensaje cuando no hay datos */
  emptyMessage?: string;
  /** Estado de paginación. Si no se pasa, no se muestra barra de paginación. */
  pagination?: PaginationState;
  /** Callback para cambio de página */
  onPageChange?: (page: number) => void;
  /** Callback para cambio de page size */
  onLimitChange?: (limit: number) => void;
  /** Si es simple (solo prev/next, sin ventana de páginas) */
  simple?: boolean;
}

const PAGE_SIZES = [10, 20, 50, 100];

function pageWindow(current: number, total: number): (number | '...')[] {
  if (total <= 1) return [];
  const w = 5;
  const pages: (number | '...')[] = [];
  const start = Math.max(2, current - w);
  const end = Math.min(total - 1, current + w);
  pages.push(1);
  if (start > 2) pages.push('...');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push('...');
  if (total > 1) pages.push(total);
  return pages;
}

export default function DataTable({
  columns,
  rows,
  loading,
  emptyMessage = 'No se encontraron resultados',
  pagination,
  onPageChange,
  onLimitChange,
  simple,
}: DataTableProps) {
  const renderPagination = () => {
    if (!pagination) return null;

    const { page, totalPages, total, limit, from, to } = pagination;
    if (totalPages <= 1 && simple) return null;

    if (simple) {
      return (
        <div className={styles.pagination}>
          <span className={styles.pageInfo}>
            Página {page} de {totalPages} ({total} resultados)
          </span>
          <div className={styles.pageNav}>
            <button className={styles.pageBtn} disabled={page <= 1} onClick={() => onPageChange?.(page - 1)}>
              Anterior
            </button>
            <button className={styles.pageBtn} disabled={page >= totalPages} onClick={() => onPageChange?.(page + 1)}>
              Siguiente
            </button>
          </div>
        </div>
      );
    }

    const pages = pageWindow(page, totalPages);

    return (
      <div className={styles.pagination}>
        <div className={styles.paginationLeft}>
          <span className={styles.pageInfo}>
            Mostrando {from}–{to} de {total}
          </span>
          <select
            value={limit}
            onChange={(e) => onLimitChange?.(Number(e.target.value))}
            className={styles.pageSizeSelect}
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>{s} por página</option>
            ))}
          </select>
        </div>

        <div className={styles.pageNav}>
          <button className={styles.pageBtn} disabled={page <= 1} onClick={() => onPageChange?.(1)} title="Primera página">«</button>
          <button className={styles.pageBtn} disabled={page <= 1} onClick={() => onPageChange?.(page - 1)}>← Anterior</button>

          {pages.map((item, i) =>
            item === '...'
              ? <span key={`e-${i}`} className={styles.pageEllipsis}>…</span>
              : (
                <button
                  key={item}
                  className={`${styles.pageNumBtn} ${item === page ? styles.pageNumActive : ''}`}
                  onClick={() => onPageChange?.(item as number)}
                >
                  {item}
                </button>
              )
          )}

          <button className={styles.pageBtn} disabled={page >= totalPages} onClick={() => onPageChange?.(page + 1)}>Siguiente →</button>
          <button className={styles.pageBtn} disabled={page >= totalPages} onClick={() => onPageChange?.(totalPages)} title="Última página">»</button>
        </div>
      </div>
    );
  };

  return (
    <>
      {pagination && pagination.totalPages > 0 && renderPagination()}

      <div className={styles.tableWrapper}>
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            Cargando...
          </div>
        ) : rows.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyTitle}>{emptyMessage}</span>
            <span className={styles.emptySubtitle}>Probá con otros filtros</span>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className={col.className}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows}
            </tbody>
          </table>
        )}
      </div>

      {pagination && pagination.totalPages > 0 && renderPagination()}
    </>
  );
}
