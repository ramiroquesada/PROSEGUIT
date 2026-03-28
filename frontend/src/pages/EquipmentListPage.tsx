import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Search, Plus, Package, X, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { useEquipmentList, useEquipmentTypes } from '../hooks/useEquipment';
import { useLocationTree } from '../hooks/useLocations';
import { resolveEstado, STATUS_LABEL, STATUS_COLOR } from '../lib/equipment-status';
import styles from './EquipmentListPage.module.css';
import { usePageTitle } from '../hooks/usePageTitle';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'NUEVO', label: 'Nuevo' },
  { value: 'ACTIVO', label: 'Activo' },
  { value: 'EN_REPARACION', label: 'En Soporte' },
  { value: 'EN_DEPOSITO', label: 'En Depósito' },
  { value: 'PRESTADO', label: 'Prestado' },
  { value: 'EN_SERVICIO_EXTERNO', label: 'En Servicio Externo' },
];

type SortCol = 'serie' | 'tipo' | 'modelo';
type SortDir = 'asc' | 'desc';

const PAGE_SIZES = [25, 50, 100];

function SortIcon({ col, sortCol, sortDir }: { col: SortCol; sortCol: SortCol | null; sortDir: SortDir }) {
  if (sortCol !== col) return <ChevronsUpDown size={13} className={styles.sortIcon} />;
  return sortDir === 'asc'
    ? <ChevronUp size={13} className={`${styles.sortIcon} ${styles.sortActive}`} />
    : <ChevronDown size={13} className={`${styles.sortIcon} ${styles.sortActive}`} />;
}

export default function EquipmentListPage() {
  usePageTitle('Equipos');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [inputValue, setInputValue] = useState('');
  const [search, setSearch] = useState('');

  const [estado, setEstado] = useState(searchParams.get('estado') ?? '');
  const [tipoEquipoId, setTipoEquipoId] = useState<number | undefined>();
  const [ciudadId, setCiudadId] = useState<number | undefined>();
  const [seccionId, setSeccionId] = useState<number | undefined>();
  const [oficinaId, setOficinaId] = useState<number | undefined>();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const [sortCol, setSortCol] = useState<SortCol | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Debounce search 300ms
  useEffect(() => {
    const t = setTimeout(() => { setSearch(inputValue); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [inputValue]);

  const scrollRef = useRef<number | null>(null);

  const { data, isLoading, isFetching } = useEquipmentList({
    page, limit,
    search: search || undefined,
    estado: estado || undefined,
    tipoEquipoId,
    ciudadId,
    seccionId,
    oficinaId,
    sortBy: sortCol ?? undefined,
    sortDir: sortCol ? sortDir : undefined,
  });

  const { data: types } = useEquipmentTypes();
  const { data: locations } = useLocationTree();

  const ciudadSel  = locations?.find((c) => c.id === ciudadId);
  const seccionSel = ciudadSel?.secciones.find((s) => s.id === seccionId);

  // Restaurar scroll cuando el fetch termina (no antes, porque la tabla aún no tiene altura final)
  useEffect(() => {
    if (!isFetching && scrollRef.current !== null) {
      window.scrollTo({ top: scrollRef.current, behavior: 'instant' });
      scrollRef.current = null;
    }
  }, [isFetching]);

  const goToPage = useCallback((n: number) => {
    scrollRef.current = window.scrollY;
    setPage(n);
  }, []);

  function resetPage() { setPage(1); }

  function resetSort() { setSortCol(null); setSortDir('asc'); }

  function handleFilterChange(fn: () => void) {
    fn();
    resetSort();
    resetPage();
  }

  function clearAll() {
    setInputValue(''); setSearch('');
    setEstado(''); setTipoEquipoId(undefined);
    setCiudadId(undefined); setSeccionId(undefined); setOficinaId(undefined);
    resetSort();
    setPage(1);
  }

  function handleSort(col: SortCol) {
    if (sortCol === col) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
    setPage(1);
  }

  // Chips de filtros activos
  const chips = [
    estado       && { key: 'estado',  label: `Estado: ${STATUS_OPTIONS.find((o) => o.value === estado)?.label}`,     clear: () => handleFilterChange(() => setEstado('')) },
    tipoEquipoId && { key: 'tipo',    label: `Tipo: ${types?.find((t) => t.id === tipoEquipoId)?.nombre}`,           clear: () => handleFilterChange(() => setTipoEquipoId(undefined)) },
    oficinaId    && { key: 'oficina', label: `Oficina: ${seccionSel?.oficinas.find((o) => o.id === oficinaId)?.nombre}`, clear: () => handleFilterChange(() => setOficinaId(undefined)) },
    !oficinaId && seccionId && { key: 'seccion', label: `Sección: ${ciudadSel?.secciones.find((s) => s.id === seccionId)?.nombre}`, clear: () => handleFilterChange(() => { setSeccionId(undefined); setOficinaId(undefined); }) },
    !seccionId && ciudadId  && { key: 'ciudad',  label: `Ciudad: ${locations?.find((c) => c.id === ciudadId)?.nombre}`, clear: () => handleFilterChange(() => { setCiudadId(undefined); setSeccionId(undefined); setOficinaId(undefined); }) },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  const total      = data?.pagination.total ?? 0;
  const totalPages = data?.pagination.totalPages ?? 1;
  const from       = total === 0 ? 0 : (page - 1) * limit + 1;
  const to         = Math.min(page * limit, total);

  // Ventana de páginas: 5 antes y 5 después de la página actual
  function buildPageWindow(): (number | '...')[] {
    if (totalPages <= 1) return [];
    const window = 5;
    const pages: (number | '...')[] = [];
    const start = Math.max(2, page - window);
    const end   = Math.min(totalPages - 1, page + window);

    pages.push(1);
    if (start > 2) pages.push('...');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push('...');
    if (totalPages > 1) pages.push(totalPages);

    return pages;
  }

  const pageWindow = buildPageWindow();

  const paginationBar = (
    <div className={styles.pagination}>
      <div className={styles.paginationLeft}>
        <span className={styles.pageInfoSub}>
          Mostrando {from}–{to} de {total} equipos
        </span>
        <select
          value={limit}
          onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
          className={styles.pageSizeSelect}
        >
          {PAGE_SIZES.map((s) => (
            <option key={s} value={s}>{s} por página</option>
          ))}
        </select>
      </div>

      <div className={styles.pageNav}>
        <button className={styles.pageBtn} disabled={page <= 1} onClick={() => goToPage(1)} title="Primera página">«</button>
        <button className={styles.pageBtn} disabled={page <= 1} onClick={() => goToPage(page - 1)}>← Anterior</button>

        {pageWindow.map((item, i) =>
          item === '...'
            ? <span key={`ellipsis-${i}`} className={styles.pageEllipsis}>…</span>
            : (
              <button
                key={item}
                className={`${styles.pageNumBtn} ${item === page ? styles.pageNumActive : ''}`}
                onClick={() => goToPage(item as number)}
              >
                {item}
              </button>
            )
        )}

        <button className={styles.pageBtn} disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>Siguiente →</button>
        <button className={styles.pageBtn} disabled={page >= totalPages} onClick={() => goToPage(totalPages)} title="Última página">»</button>
      </div>
    </div>
  );

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>

        {/* Fila 1: búsqueda + botón */}
        <div className={styles.searchRow}>
          <div className={styles.searchWrapper}>
            <Search className={styles.searchIcon} size={16} />
            <input
              type="text"
              placeholder="Buscar por serie, modelo, tipo, ubicación, IP..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className={styles.searchInput}
            />
            {inputValue && (
              <button className={styles.searchClear} onClick={() => { setInputValue(''); setSearch(''); setPage(1); }}>
                <X size={14} />
              </button>
            )}
          </div>
          <button className={styles.addBtn} onClick={() => navigate('/equipos/nuevo')}>
            <Plus size={16} />
            Nuevo Equipo
          </button>
        </div>

        {/* Fila 2: filtros en cascada */}
        <div className={styles.filterRow}>
          <select value={estado} onChange={(e) => handleFilterChange(() => setEstado(e.target.value))} className={styles.select}>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <select
            value={ciudadId ?? ''}
            onChange={(e) => handleFilterChange(() => { setCiudadId(e.target.value ? Number(e.target.value) : undefined); setSeccionId(undefined); setOficinaId(undefined); })}
            className={styles.select}
          >
            <option value="">Todas las ciudades</option>
            {locations?.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>

          {ciudadId && (
            <select
              value={seccionId ?? ''}
              onChange={(e) => handleFilterChange(() => { setSeccionId(e.target.value ? Number(e.target.value) : undefined); setOficinaId(undefined); })}
              className={styles.select}
            >
              <option value="">Todas las secciones</option>
              {ciudadSel?.secciones.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          )}

          {seccionId && (
            <select
              value={oficinaId ?? ''}
              onChange={(e) => handleFilterChange(() => setOficinaId(e.target.value ? Number(e.target.value) : undefined))}
              className={styles.select}
            >
              <option value="">Todas las oficinas</option>
              {seccionSel?.oficinas.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
            </select>
          )}

          <select
            value={tipoEquipoId ?? ''}
            onChange={(e) => handleFilterChange(() => setTipoEquipoId(e.target.value ? Number(e.target.value) : undefined))}
            className={styles.select}
          >
            <option value="">Todos los tipos</option>
            {types?.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>

        </div>

        {/* Fila 3: chips de filtros activos */}
        {chips.length > 0 && (
          <div className={styles.activeFilters}>
            {chips.map((chip) => (
              <button key={chip.key} className={styles.filterChip} onClick={chip.clear}>
                {chip.label}
                <X size={11} />
              </button>
            ))}
            {chips.length > 1 && (
              <button className={styles.clearAll} onClick={clearAll}>Limpiar todo</button>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className={styles.loadingWrapper}>
          <div className={styles.loadingSpinner} />
          <span>Cargando equipos...</span>
        </div>
      ) : (
        <>
          {totalPages > 1 && paginationBar}
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>
                    <button className={styles.sortBtn} onClick={() => handleSort('serie')}>
                      Serie <SortIcon col="serie" sortCol={sortCol} sortDir={sortDir} />
                    </button>
                  </th>
                  <th>
                    <button className={styles.sortBtn} onClick={() => handleSort('tipo')}>
                      Tipo <SortIcon col="tipo" sortCol={sortCol} sortDir={sortDir} />
                    </button>
                  </th>
                  <th>
                    <button className={styles.sortBtn} onClick={() => handleSort('modelo')}>
                      Modelo <SortIcon col="modelo" sortCol={sortCol} sortDir={sortDir} />
                    </button>
                  </th>
                  <th>Ubicación</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {data?.data.map((eq) => {
                  const est = resolveEstado(eq.estado, eq.oficina.nombre);
                  return (
                    <tr key={eq.id} onClick={() => navigate(`/equipos/${eq.id}`)} className={styles.row}>
                      <td className={styles.serie}>{eq.serie}</td>
                      <td className={styles.tipo}>{eq.tipoEquipo.nombre}</td>
                      <td>{eq.modelo || '—'}</td>
                      <td>
                        <div className={styles.location}>
                          <span className={styles.locationCity}>{eq.oficina.seccion.ciudad.nombre}</span>
                          <span className={styles.locationOffice}>{eq.oficina.nombre}</span>
                        </div>
                      </td>
                      <td>
                        <span className={styles.badge} data-color={STATUS_COLOR[est] || 'neutral'}>
                          {STATUS_LABEL[est] || est}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {data?.data.length === 0 && (
                  <tr>
                    <td colSpan={5}>
                      <div className={styles.emptyWrapper}>
                        <Package size={40} className={styles.emptyIcon} />
                        <span className={styles.emptyTitle}>No se encontraron equipos</span>
                        <span className={styles.emptySubtitle}>Probá con otros filtros</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && paginationBar}
        </>
      )}
    </div>
  );
}
