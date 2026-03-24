import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Search, Plus, Package } from 'lucide-react';
import { useEquipmentList, useEquipmentTypes } from '../hooks/useEquipment';
import { useLocationTree } from '../hooks/useLocations';
import styles from './EquipmentListPage.module.css';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'ACTIVO', label: 'Activo' },
  { value: 'EN_REPARACION', label: 'En Reparación' },
  { value: 'DADO_DE_BAJA', label: 'Dado de Baja' },
  { value: 'EN_DEPOSITO', label: 'En Depósito' },
  { value: 'PRESTADO', label: 'Prestado' },
  { value: 'EN_SERVICIO_EXTERNO', label: 'En Servicio Externo' },
];

const STATUS_BADGE: Record<string, string> = {
  ACTIVO: 'success',
  EN_REPARACION: 'warning',
  DADO_DE_BAJA: 'danger',
  EN_DEPOSITO: 'info',
  PRESTADO: 'warning',
  EN_SERVICIO_EXTERNO: 'info',
};

export default function EquipmentListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [estado, setEstado] = useState('');
  const [tipoEquipoId, setTipoEquipoId] = useState<number | undefined>();
  const [ciudadId, setCiudadId] = useState<number | undefined>();

  const { data, isLoading } = useEquipmentList({
    page,
    limit: 25,
    search: search || undefined,
    estado: estado || undefined,
    tipoEquipoId,
    ciudadId,
  });

  const { data: types } = useEquipmentTypes();
  const { data: locations } = useLocationTree();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
  }

  const total = data?.pagination.total ?? 0;
  const from = total === 0 ? 0 : (page - 1) * 25 + 1;
  const to = Math.min(page * 25, total);

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <form className={styles.searchForm} onSubmit={handleSearch}>
          <Search className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Buscar por serie, modelo, IP..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className={styles.searchInput}
          />
        </form>

        <div className={styles.filters}>
          <select
            value={estado}
            onChange={(e) => { setEstado(e.target.value); setPage(1); }}
            className={styles.select}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select
            value={tipoEquipoId ?? ''}
            onChange={(e) => { setTipoEquipoId(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}
            className={styles.select}
          >
            <option value="">Todos los tipos</option>
            {types?.map((t) => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </select>

          <select
            value={ciudadId ?? ''}
            onChange={(e) => { setCiudadId(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}
            className={styles.select}
          >
            <option value="">Todas las ciudades</option>
            {locations?.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>

        <button className={styles.addBtn} onClick={() => navigate('/equipos/nuevo')}>
          <Plus size={16} />
          Nuevo Equipo
        </button>
      </div>

      {isLoading ? (
        <div className={styles.loadingWrapper}>
          <div className={styles.loadingSpinner} />
          <span>Cargando equipos...</span>
        </div>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Serie</th>
                  <th>Modelo</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th>Ubicación</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {data?.data.map((eq) => (
                  <tr key={eq.id} onClick={() => navigate(`/equipos/${eq.id}`)} className={styles.row}>
                    <td className={styles.serie}>{eq.serie}</td>
                    <td>{eq.modelo || '—'}</td>
                    <td>{eq.tipoEquipo.nombre}</td>
                    <td>
                      <span className={styles.badge} data-color={STATUS_BADGE[eq.estado] || 'neutral'}>
                        {STATUS_OPTIONS.find((s) => s.value === eq.estado)?.label || eq.estado}
                      </span>
                    </td>
                    <td>
                      <div className={styles.location}>
                        <span className={styles.locationCity}>{eq.oficina.seccion.ciudad.nombre}</span>
                        <span className={styles.locationOffice}>{eq.oficina.nombre}</span>
                      </div>
                    </td>
                    <td className={styles.ip}>{eq.ip || '—'}</td>
                  </tr>
                ))}
                {data?.data.length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      <div className={styles.emptyWrapper}>
                        <Package size={40} className={styles.emptyIcon} />
                        <span className={styles.emptyTitle}>No se encontraron equipos</span>
                        <span className={styles.emptySubtitle}>Probá con otros filtros o agregá un nuevo equipo</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {data && data.pagination.totalPages > 1 && (
            <div className={styles.pagination}>
              <div className={styles.pageNav}>
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className={styles.pageBtn}
                >
                  ← Anterior
                </button>
                <span className={styles.pageInfoMain}>
                  Página {data.pagination.page} / {data.pagination.totalPages}
                </span>
                <button
                  disabled={page >= data.pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className={styles.pageBtn}
                >
                  Siguiente →
                </button>
              </div>
              <span className={styles.pageInfoSub}>
                Mostrando {from}–{to} de {total} equipos
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
