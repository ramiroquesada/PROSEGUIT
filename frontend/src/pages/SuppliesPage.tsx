import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Search, X, Plus, Minus, ChevronDown, Tags, PackagePlus } from 'lucide-react';
import { useSupplies, useSupplyCategories, useSupplyMovements, type Insumo, type TipoMovimiento } from '../hooks/useSupplies';
import { MOVIMIENTO_OPTIONS, formatFecha, pluralUnidad } from '../lib/supply-movements';
import MovementModal from '../components/supplies/MovementModal';
import SupplyFormModal from '../components/supplies/SupplyFormModal';
import CategoriesModal from '../components/supplies/CategoriesModal';
import MovementsTable from '../components/supplies/MovementsTable';
import { usePageTitle } from '../hooks/usePageTitle';
import styles from '../components/supplies/supplies.module.css';

type Tab = 'stock' | 'movimientos';

interface Grupo { categoria: string; categoriaId: number; items: Insumo[]; sinStock: number }

/** Normaliza para buscar sin importar tildes ni mayúsculas ("cafe" encuentra "Café"). */
function norm(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function agrupar(items: Insumo[], search: string, categoriaId: string, soloSinStock: boolean): Grupo[] {
  const palabras = norm(search.trim()).split(/\s+/).filter(Boolean);
  const grupos = new Map<number, Grupo>();
  for (const i of items) {
    if (categoriaId && String(i.categoria.id) !== categoriaId) continue;
    if (soloSinStock && i.stock > 0) continue;
    // Todas las palabras tienen que aparecer: "hdmi 3" encuentra "Cable HDMI 3 m".
    const texto = norm(`${i.nombre} ${i.categoria.nombre}`);
    if (!palabras.every((p) => texto.includes(p))) continue;
    const g = grupos.get(i.categoria.id) ?? { categoria: i.categoria.nombre, categoriaId: i.categoria.id, items: [], sinStock: 0 };
    g.items.push(i);
    if (i.stock === 0) g.sinStock++;
    grupos.set(i.categoria.id, g);
  }
  return [...grupos.values()].sort((a, b) => a.categoria.localeCompare(b.categoria));
}

export default function SuppliesPage() {
  usePageTitle('Insumos');
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('vista') === 'movimientos' ? 'movimientos' : 'stock';

  return (
    <div className={styles.page}>
      <div className={styles.tabs} role="tablist">
        <button role="tab" className={styles.tab} data-active={tab === 'stock'} aria-selected={tab === 'stock'}
          onClick={() => setParams({})}>Stock</button>
        <button role="tab" className={styles.tab} data-active={tab === 'movimientos'} aria-selected={tab === 'movimientos'}
          onClick={() => setParams({ vista: 'movimientos' })}>Movimientos</button>
      </div>
      {tab === 'stock' ? <StockView /> : <MovementsView />}
    </div>
  );
}

// ── Vista de stock ──────────────────────────────────────────────────────────

function StockView() {
  const navigate = useNavigate();
  const [verBajas, setVerBajas] = useState(false);
  const { data, isLoading, isError } = useSupplies(verBajas);
  const { data: categorias } = useSupplyCategories();

  const [search, setSearch] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [soloSinStock, setSoloSinStock] = useState(false);
  const [plegadas, setPlegadas] = useState<Set<number>>(new Set());
  const [movimiento, setMovimiento] = useState<{ insumo: Insumo; tipo: TipoMovimiento } | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const [verCategorias, setVerCategorias] = useState(false);

  const items = data ?? [];
  const grupos = agrupar(items, search, categoriaId, soloSinStock);
  const buscando = search.trim() !== '';

  function toggle(id: number) {
    setPlegadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function abrir(e: React.MouseEvent, insumo: Insumo, tipo: TipoMovimiento) {
    e.stopPropagation();
    setMovimiento({ insumo, tipo });
  }

  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <Search size={15} className={styles.searchIcon} />
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Buscar insumo (ej: hdmi, pila aa)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          {search && (
            <button className={styles.searchClear} onClick={() => setSearch('')} aria-label="Limpiar búsqueda"><X size={13} /></button>
          )}
        </div>
        <select className={styles.filter} value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} aria-label="Categoría">
          <option value="">Todas las categorías</option>
          {categorias?.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <label className={styles.check}>
          <input type="checkbox" checked={soloSinStock} onChange={(e) => setSoloSinStock(e.target.checked)} /> Sin stock
        </label>
        <label className={styles.check}>
          <input type="checkbox" checked={verBajas} onChange={(e) => setVerBajas(e.target.checked)} /> Dados de baja
        </label>
        <div className={styles.toolbarEnd}>
          <button className={styles.btn} onClick={() => setVerCategorias(true)}><Tags size={15} /> Categorías</button>
          <button className={styles.btn} data-variant="primary" onClick={() => setNuevo(true)}><PackagePlus size={15} /> Nuevo insumo</button>
        </div>
      </div>

      {isLoading ? (
        <div className={styles.empty}>Cargando insumos...</div>
      ) : isError ? (
        <div className={styles.error}>No se pudieron cargar los insumos.</div>
      ) : grupos.length === 0 ? (
        <div className={styles.empty}>
          {items.length === 0
            ? 'Todavía no hay insumos cargados. Empezá con "Nuevo insumo".'
            : buscando
              ? <>No hay insumos que coincidan con "{search}". <button className={styles.link} onClick={() => setNuevo(true)}>Crear uno nuevo</button></>
              : 'Ningún insumo coincide con el filtro.'}
        </div>
      ) : (
        <div className={styles.groups}>
          {grupos.map((g) => {
            // Al buscar se muestran todas las categorías abiertas.
            const abierta = buscando || !plegadas.has(g.categoriaId);
            return (
              <section key={g.categoriaId} className={styles.panel}>
                <button className={styles.groupHeader} aria-expanded={abierta} onClick={() => toggle(g.categoriaId)}>
                  <ChevronDown size={16} />
                  <span className={styles.groupName}>{g.categoria}</span>
                  <span className={styles.groupCount}>{g.items.length} ítem{g.items.length === 1 ? '' : 's'}</span>
                  {g.sinStock > 0 && <span className={styles.groupMeta}>{g.sinStock} sin stock</span>}
                </button>
                {abierta && (
                  <div className={styles.tableWrapper}>
                    <table className={`${styles.table} ${styles.catalogTable}`}>
                      <thead>
                        <tr><th>Insumo</th><th>Stock</th><th>Último movimiento</th><th aria-label="Acciones" /></tr>
                      </thead>
                      <tbody>
                        {g.items.map((i) => {
                          const ultimo = i.movimientos?.[0];
                          return (
                            <tr key={i.id} data-link="true" onClick={() => navigate(`/insumos/${i.id}`)}>
                              <td>
                                <span className={styles.itemName}>{i.nombre}</span>
                                {!i.activo && <span className={styles.inactive}>(dado de baja)</span>}
                              </td>
                              <td>
                                <span className={styles.stock} data-empty={i.stock === 0}>{i.stock}</span>
                                <span className={styles.unit}>{pluralUnidad(i.stock, i.unidad)}</span>
                              </td>
                              <td>{ultimo ? formatFecha(ultimo.fecha) : <span className={styles.muted}>Sin movimientos</span>}</td>
                              <td>
                                {i.activo && (
                                  <div className={styles.rowActions}>
                                    <button className={styles.quickBtn} data-tone="success" onClick={(e) => abrir(e, i, 'INGRESO')}>
                                      <Plus size={13} /> <span className={styles.quickLabel}>Ingreso</span>
                                    </button>
                                    <button className={styles.quickBtn} data-tone="info" disabled={i.stock === 0}
                                      onClick={(e) => abrir(e, i, 'ENTREGA')}>
                                      <Minus size={13} /> <span className={styles.quickLabel}>Entregar</span>
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {movimiento && <MovementModal insumo={movimiento.insumo} tipo={movimiento.tipo} onClose={() => setMovimiento(null)} />}
      {nuevo && (
        <SupplyFormModal
          categoriaInicial={categoriaId ? Number(categoriaId) : undefined}
          onClose={() => setNuevo(false)}
        />
      )}
      {verCategorias && <CategoriesModal onClose={() => setVerCategorias(false)} />}
    </>
  );
}

// ── Vista de movimientos (registro global) ─────────────────────────────────

function MovementsView() {
  const { data: categorias } = useSupplyCategories();
  const [tipo, setTipo] = useState<TipoMovimiento | ''>('');
  const [categoriaId, setCategoriaId] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, isFetching } = useSupplyMovements({
    page,
    tipo,
    categoriaId: categoriaId ? Number(categoriaId) : undefined,
    desde: desde || undefined,
    hasta: hasta || undefined,
  });

  // Cualquier cambio de filtro vuelve a la primera página.
  function filtro<T>(set: (v: T) => void) {
    return (v: T) => { set(v); setPage(1); };
  }

  const pag = data?.pagination;

  return (
    <>
      <div className={styles.toolbar}>
        <select className={styles.filter} value={tipo} onChange={(e) => filtro(setTipo)(e.target.value as TipoMovimiento | '')} aria-label="Tipo">
          <option value="">Todos los tipos</option>
          {MOVIMIENTO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select className={styles.filter} value={categoriaId} onChange={(e) => filtro(setCategoriaId)(e.target.value)} aria-label="Categoría">
          <option value="">Todas las categorías</option>
          {categorias?.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <label className={styles.check}>
          Desde <input type="date" className={styles.filter} value={desde} onChange={(e) => filtro(setDesde)(e.target.value)} />
        </label>
        <label className={styles.check}>
          Hasta <input type="date" className={styles.filter} value={hasta} onChange={(e) => filtro(setHasta)(e.target.value)} />
        </label>
      </div>

      {isLoading ? (
        <div className={styles.empty}>Cargando movimientos...</div>
      ) : isError ? (
        <div className={styles.error}>No se pudieron cargar los movimientos.</div>
      ) : !data || data.data.length === 0 ? (
        <div className={styles.empty}>No hay movimientos con esos filtros.</div>
      ) : (
        <section className={styles.panel} style={{ opacity: isFetching ? 0.7 : 1 }}>
          <MovementsTable movimientos={data.data} conInsumo />
          {pag && pag.totalPages > 1 && (
            <div className={styles.pager}>
              <span>{pag.total} movimientos · página {pag.page} de {pag.totalPages}</span>
              <span style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                <button className={styles.btn} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</button>
                <button className={styles.btn} disabled={page >= pag.totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente</button>
              </span>
            </div>
          )}
        </section>
      )}
    </>
  );
}
