import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Search, X, PackageCheck, Boxes, PackageSearch, Hourglass } from 'lucide-react';
import { useStock, useSetStockStage, type StockItem } from '../hooks/useEquipment';
import { daysSince, getWarrantyDaysLeft, STOCK_ETAPA_LABEL } from '../lib/equipment-status';
import TypeBadge from '../components/ui/TypeBadge';
import { usePageTitle } from '../hooks/usePageTitle';
import styles from './StockPage.module.css';

type EtapaFiltro = '' | 'LISTO' | 'A_REVISAR';

interface Grupo {
  tipo: string;
  items: StockItem[];
  listos: number;
  aRevisar: number;
}

function etapaDe(item: StockItem) {
  return item.stockEtapa ?? 'LISTO';
}

function formatDias(dias: number | null) {
  if (dias === null) return '—';
  if (dias === 0) return 'Hoy';
  return `${dias} día${dias === 1 ? '' : 's'}`;
}

/** Filtra por etapa y búsqueda, y agrupa por tipo de equipo (más numeroso primero). */
function agrupar(items: StockItem[], search: string, etapa: EtapaFiltro): Grupo[] {
  const q = search.trim().toLowerCase();
  const filtrados = items.filter((i) => {
    if (etapa && etapaDe(i) !== etapa) return false;
    if (!q) return true;
    return (
      String(i.serie).includes(q) ||
      (i.modelo ?? '').toLowerCase().includes(q) ||
      (i.template?.nombre ?? '').toLowerCase().includes(q) ||
      i.tipoEquipo.nombre.toLowerCase().includes(q)
    );
  });

  const porTipo = new Map<string, Grupo>();
  for (const item of filtrados) {
    const key = item.tipoEquipo.nombre;
    const g = porTipo.get(key) ?? { tipo: key, items: [], listos: 0, aRevisar: 0 };
    g.items.push(item);
    if (etapaDe(item) === 'LISTO') g.listos++;
    else g.aRevisar++;
    porTipo.set(key, g);
  }
  return [...porTipo.values()].sort((a, b) => b.items.length - a.items.length || a.tipo.localeCompare(b.tipo));
}

export default function StockPage() {
  usePageTitle('Stock');
  const navigate = useNavigate();
  const { data, isLoading, isError } = useStock();
  const stageMutation = useSetStockStage();

  const [search, setSearch] = useState('');
  const [etapa, setEtapa] = useState<EtapaFiltro>('');
  const [stageError, setStageError] = useState('');

  const items = data ?? [];
  const listos = items.filter((i) => etapaDe(i) === 'LISTO').length;
  const aRevisar = items.length - listos;
  const masAntiguo = items.reduce<number | null>((max, i) => {
    const d = daysSince(i.stockDesde);
    return d !== null && (max === null || d > max) ? d : max;
  }, null);

  const grupos = agrupar(items, search, etapa);

  async function marcarListo(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    setStageError('');
    try {
      await stageMutation.mutateAsync({ id, etapa: 'LISTO' });
    } catch (err) {
      setStageError(err instanceof Error ? err.message : 'No se pudo marcar como listo');
    }
  }

  const etapaOpciones: { value: EtapaFiltro; label: string; count: number }[] = [
    { value: '', label: 'Todos', count: items.length },
    { value: 'LISTO', label: 'Listos', count: listos },
    { value: 'A_REVISAR', label: 'A revisar', count: aRevisar },
  ];

  return (
    <div className={styles.page}>
      {/* ── Resumen ── */}
      <div className={styles.summary}>
        <div className={styles.stat}>
          <span className={styles.statIcon} data-tone="primary"><Boxes size={18} /></span>
          <div>
            <div className={styles.statValue}>{items.length}</div>
            <div className={styles.statLabel}>Equipos disponibles</div>
          </div>
        </div>
        <button
          className={styles.stat}
          data-active={etapa === 'LISTO'}
          onClick={() => setEtapa(etapa === 'LISTO' ? '' : 'LISTO')}
        >
          <span className={styles.statIcon} data-tone="success"><PackageCheck size={18} /></span>
          <div>
            <div className={styles.statValue}>{listos}</div>
            <div className={styles.statLabel}>Listos para entregar</div>
          </div>
        </button>
        <button
          className={styles.stat}
          data-active={etapa === 'A_REVISAR'}
          onClick={() => setEtapa(etapa === 'A_REVISAR' ? '' : 'A_REVISAR')}
        >
          <span className={styles.statIcon} data-tone="warning"><PackageSearch size={18} /></span>
          <div>
            <div className={styles.statValue}>{aRevisar}</div>
            <div className={styles.statLabel}>A revisar</div>
          </div>
        </button>
        <div className={styles.stat}>
          <span className={styles.statIcon} data-tone="neutral"><Hourglass size={18} /></span>
          <div>
            <div className={styles.statValue}>{masAntiguo === null ? '—' : formatDias(masAntiguo)}</div>
            <div className={styles.statLabel}>El más antiguo en stock</div>
          </div>
        </div>
      </div>

      {/* ── Filtros ── */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <Search size={15} className={styles.searchIcon} />
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Buscar por serie, modelo o tipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className={styles.searchClear} onClick={() => setSearch('')} aria-label="Limpiar búsqueda">
              <X size={13} />
            </button>
          )}
        </div>
        <div className={styles.segmented} role="tablist">
          {etapaOpciones.map((o) => (
            <button
              key={o.value || 'todos'}
              role="tab"
              aria-selected={etapa === o.value}
              className={styles.segment}
              data-active={etapa === o.value}
              onClick={() => setEtapa(o.value)}
            >
              {o.label} <span className={styles.segmentCount}>{o.count}</span>
            </button>
          ))}
        </div>
      </div>

      {stageError && <div className={styles.error}>{stageError}</div>}

      {/* ── Contenido ── */}
      {isLoading ? (
        <div className={styles.empty}>Cargando stock...</div>
      ) : isError ? (
        <div className={styles.error}>No se pudo cargar el stock.</div>
      ) : grupos.length === 0 ? (
        <div className={styles.empty}>
          {items.length === 0
            ? 'No hay equipos en stock. Los equipos nuevos aparecen acá apenas se dan de alta.'
            : 'Ningún equipo coincide con el filtro.'}
        </div>
      ) : (
        <div className={styles.groups}>
          {grupos.map((g) => (
            <section key={g.tipo} className={styles.group}>
              <header className={styles.groupHeader}>
                <div className={styles.groupTitle}>
                  <TypeBadge label={g.tipo} />
                  <span className={styles.groupCount}>{g.items.length}</span>
                </div>
                <div className={styles.groupMeta}>
                  <span data-tone="success">{g.listos} listo{g.listos === 1 ? '' : 's'}</span>
                  {g.aRevisar > 0 && <span data-tone="warning">{g.aRevisar} a revisar</span>}
                </div>
              </header>

              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Serie</th>
                      <th>Modelo</th>
                      <th>Condición</th>
                      <th>Etapa</th>
                      <th>En stock</th>
                      <th>Garantía</th>
                      <th aria-label="Acciones" />
                    </tr>
                  </thead>
                  <tbody>
                    {g.items.map((item) => {
                      const et = etapaDe(item);
                      const dias = daysSince(item.stockDesde);
                      const garantia = getWarrantyDaysLeft(item.garantiaHasta);
                      return (
                        <tr key={item.id} onClick={() => navigate(`/equipos/${item.id}`)}>
                          <td className={styles.serie}>{item.serie}</td>
                          <td>{item.modelo || item.template?.nombre || <span className={styles.muted}>Sin modelo</span>}</td>
                          <td>
                            <span className={styles.pill} data-tone={item.estado === 'NUEVO' ? 'new' : 'neutral'}>
                              {item.estado === 'NUEVO' ? 'Nuevo' : 'Usado'}
                            </span>
                          </td>
                          <td>
                            <span className={styles.pill} data-tone={et === 'LISTO' ? 'success' : 'warning'}>
                              {STOCK_ETAPA_LABEL[et]}
                            </span>
                          </td>
                          <td className={styles.num}>{formatDias(dias)}</td>
                          <td className={styles.num}>
                            {garantia === null
                              ? <span className={styles.muted}>—</span>
                              : garantia < 0
                                ? <span className={styles.warrantyExpired}>Vencida</span>
                                : <span data-soon={garantia <= 30}>{formatDias(garantia)}</span>}
                          </td>
                          <td className={styles.actionCell}>
                            {et === 'A_REVISAR' && (
                              <button
                                className={styles.quickBtn}
                                onClick={(e) => marcarListo(e, item.id)}
                                disabled={stageMutation.isPending}
                              >
                                <PackageCheck size={14} /> Listo
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
