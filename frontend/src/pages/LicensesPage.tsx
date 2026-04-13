import { useState, useEffect } from 'react';
import { useLicenses, useLicensesSummary, useCreateLicense, useUpdateLicense, useDeleteLicense, type Licencia } from '../hooks/useLicenses';
import { resolveLicenseStatus, LICENSE_STATUS_LABEL, LICENSE_STATUS_COLOR } from '../lib/license-status';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { api } from '../lib/api-client';
import styles from './LicensesPage.module.css';
import { usePageTitle } from '../hooks/usePageTitle';

type ModalMode = 'crear' | 'editar' | null;

export default function LicensesPage() {
  usePageTitle('Licencias');

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('');
  const [filterSoftware, setFilterSoftware] = useState('');

  const { data: licensesData, isLoading } = useLicenses({
    page,
    limit: 20,
    software: filterSoftware || undefined,
    estado: (filterEstado as any) || undefined,
    search: search || undefined,
  });

  const { data: summaryData } = useLicensesSummary();
  const createMutation = useCreateLicense();
  const updateMutation = useUpdateLicense();
  const deleteMutation = useDeleteLicense();

  // Modal
  const [modal, setModal] = useState<ModalMode>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [modalError, setModalError] = useState('');

  // Form
  const [form, setForm] = useState({
    software: '',
    version: '',
    fechaExpiracion: '',
    equipoSerie: '',
    equipoId: '',
  });

  const licencias = licensesData?.data || [];
  const pagination = licensesData?.pagination;

  function openCreateModal() {
    setForm({ software: '', version: '', fechaExpiracion: '', equipoSerie: '', equipoId: '' });
    setEditingId(null);
    setModalError('');
    setModal('crear');
  }

  function openEditModal(lic: Licencia) {
    setEditingId(lic.id);
    setForm({
      software: lic.software,
      version: lic.version || '',
      fechaExpiracion: lic.fechaExpiracion ? lic.fechaExpiracion.split('T')[0] : '',
      equipoSerie: String(lic.equipo.serie),
      equipoId: String(lic.equipoId),
    });
    setModalError('');
    setModal('editar');
  }

  function closeModal() {
    setModal(null);
    setEditingId(null);
    setModalError('');
  }

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setModalError('');
  }

  async function handleEquipoSerieBlur() {
    if (!form.equipoSerie.trim() || modal === 'editar') return;

    try {
      const response = await api.get<any>(
        `/equipment?search=${encodeURIComponent(form.equipoSerie.trim())}&limit=1`
      );

      if (response.data && response.data.length > 0) {
        const equipo = response.data[0];
        setForm((prev) => ({ ...prev, equipoId: String(equipo.id) }));
      } else {
        setModalError('No se encontró el equipo con esa serie');
        setForm((prev) => ({ ...prev, equipoId: '' }));
      }
    } catch (err) {
      setModalError('Error al buscar el equipo');
      setForm((prev) => ({ ...prev, equipoId: '' }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.software.trim()) {
      setModalError('El nombre del software es requerido');
      return;
    }

    if (!form.equipoId) {
      setModalError('El equipo es requerido');
      return;
    }

    try {
      const data = {
        software: form.software.trim(),
        version: form.version.trim() || undefined,
        fechaExpiracion: form.fechaExpiracion || undefined,
        equipoId: Number(form.equipoId),
      };

      if (modal === 'crear') {
        await createMutation.mutateAsync(data);
      } else if (editingId) {
        const { equipoId, ...updateData } = data;
        await updateMutation.mutateAsync({ id: editingId, data: updateData });
      }

      closeModal();
      setPage(1);
    } catch (err: any) {
      setModalError(err.message || 'Error al guardar la licencia');
    }
  }

  async function handleDelete(id: number) {
    if (confirm('¿Eliminar esta licencia?')) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (err: any) {
        alert('Error: ' + (err.message || 'No se pudo eliminar'));
      }
    }
  }

  function handleSummaryCardClick(software: string) {
    setFilterSoftware(software);
    setPage(1);
  }

  const pageCount = pagination?.totalPages || 1;
  const pageWindow = 5;
  const startPage = Math.max(1, page - Math.floor(pageWindow / 2));
  const endPage = Math.min(pageCount, startPage + pageWindow - 1);
  const adjustedStart = Math.max(1, endPage - pageWindow + 1);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Licencias</h1>
        <button className={styles.btnNew} onClick={openCreateModal}>
          <Plus size={18} /> Nueva licencia
        </button>
      </header>

      {/* ── Resumen por software ───────────────────────────────────────── */}
      {summaryData && summaryData.length > 0 && (
        <section className={styles.summary}>
          <h2>Resumen por software</h2>
          <div className={styles.summaryGrid}>
            {summaryData.map((item) => (
              <div
                key={item.software}
                className={`${styles.summaryCard} ${filterSoftware === item.software ? styles.active : ''}`}
                onClick={() => handleSummaryCardClick(item.software)}
              >
                <div className={styles.softwareName}>{item.software}</div>
                <div className={styles.summaryBadges}>
                  <span className={styles.badge} style={{ backgroundColor: 'var(--color-success)' }}>
                    {item.vigentes} Vigente
                  </span>
                  <span className={styles.badge} style={{ backgroundColor: 'var(--color-warning)' }}>
                    {item.porVencer} Por vencer
                  </span>
                  <span className={styles.badge} style={{ backgroundColor: 'var(--color-danger)' }}>
                    {item.vencidas} Vencida
                  </span>
                </div>
                <div className={styles.summaryTotal}>Total: {item.total}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Tabla de licencias ────────────────────────────────────────── */}
      <section className={styles.tableSection}>
        <div className={styles.filters}>
          <input
            type="text"
            placeholder="Buscar por software, equipo o serie..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className={styles.searchInput}
          />
          <select
            value={filterEstado}
            onChange={(e) => {
              setFilterEstado(e.target.value);
              setPage(1);
            }}
            className={styles.filterSelect}
          >
            <option value="">Todos los estados</option>
            <option value="VIGENTE">Vigente</option>
            <option value="POR_VENCER">Por vencer</option>
            <option value="VENCIDA">Vencida</option>
          </select>
          {filterSoftware && (
            <button
              className={styles.btnClearFilter}
              onClick={() => {
                setFilterSoftware('');
                setPage(1);
              }}
            >
              Limpiar software
            </button>
          )}
        </div>

        {isLoading ? (
          <p className={styles.loading}>Cargando...</p>
        ) : licencias.length === 0 ? (
          <p className={styles.empty}>Sin licencias registradas</p>
        ) : (
          <>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Software</th>
                  <th>Versión</th>
                  <th>Equipo</th>
                  <th>Fecha de expiración</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {licencias.map((lic) => (
                  <tr key={lic.id}>
                    <td>{lic.software}</td>
                    <td>{lic.version || '—'}</td>
                    <td className={styles.equipoCell}>
                      Serie #{lic.equipo.serie} — {lic.equipo.tipoEquipo.nombre}
                    </td>
                    <td>
                      {lic.fechaExpiracion
                        ? new Date(lic.fechaExpiracion).toLocaleDateString('es-ES')
                        : 'Sin expiración'}
                    </td>
                    <td>
                      <span
                        className={styles.badge}
                        style={{ backgroundColor: LICENSE_STATUS_COLOR[lic.estado!] }}
                      >
                        {LICENSE_STATUS_LABEL[lic.estado!]}
                      </span>
                    </td>
                    <td className={styles.actions}>
                      <button
                        className={styles.btnIcon}
                        onClick={() => openEditModal(lic)}
                        title="Editar"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className={styles.btnIcon}
                        onClick={() => handleDelete(lic.id)}
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {pageCount > 1 && (
              <div className={styles.pagination}>
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={styles.paginationBtn}
                >
                  ← Anterior
                </button>
                <div className={styles.pageNumbers}>
                  {adjustedStart > 1 && (
                    <>
                      <button onClick={() => setPage(1)} className={styles.pageNum}>
                        1
                      </button>
                      {adjustedStart > 2 && <span>...</span>}
                    </>
                  )}
                  {Array.from({ length: endPage - adjustedStart + 1 }, (_, i) => adjustedStart + i).map(
                    (p) => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`${styles.pageNum} ${page === p ? styles.active : ''}`}
                      >
                        {p}
                      </button>
                    ),
                  )}
                  {endPage < pageCount && (
                    <>
                      {endPage < pageCount - 1 && <span>...</span>}
                      <button onClick={() => setPage(pageCount)} className={styles.pageNum}>
                        {pageCount}
                      </button>
                    </>
                  )}
                </div>
                <button
                  disabled={page === pageCount}
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  className={styles.paginationBtn}
                >
                  Siguiente →
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Modal ──────────────────────────────────────────────────────── */}
      {modal && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2>{modal === 'crear' ? 'Nueva licencia' : 'Editar licencia'}</h2>

            {modalError && <div className={styles.error}>{modalError}</div>}

            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label>Software *</label>
                <input
                  type="text"
                  name="software"
                  value={form.software}
                  onChange={handleFormChange}
                  placeholder="Ej: Windows 11, Office 365"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Versión</label>
                <input
                  type="text"
                  name="version"
                  value={form.version}
                  onChange={handleFormChange}
                  placeholder="Ej: 22H2, 2024"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Fecha de expiración</label>
                <input
                  type="date"
                  name="fechaExpiracion"
                  value={form.fechaExpiracion}
                  onChange={handleFormChange}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Equipo (Serie) *</label>
                <input
                  type="text"
                  name="equipoSerie"
                  value={form.equipoSerie}
                  placeholder="Número de serie del equipo"
                  disabled={modal === 'editar'}
                  readOnly={modal === 'editar'}
                  onChange={handleFormChange}
                  onBlur={handleEquipoSerieBlur}
                />
                {!form.equipoId && modal === 'crear' && (
                  <small className={styles.hint}>Ingresa la serie y pierde el foco para buscar el equipo</small>
                )}
              </div>

              <div className={styles.formActions}>
                <button type="button" onClick={closeModal} className={styles.btnCancel}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.btnSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {modal === 'crear' ? 'Crear' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
