import { useState } from 'react';
import { useLoans, useCreateLoan, useReturnLoan } from '../hooks/useLoans';
import { useLocationTree } from '../hooks/useLocations';
import { api } from '../lib/api-client';
import styles from './LoansPage.module.css';
import { usePageTitle } from '../hooks/usePageTitle';

type ModalType = 'nuevo' | 'devolucion' | null;

export default function LoansPage() {
  usePageTitle('Préstamos');
  const [page, setPage] = useState(1);
  const [activo, setActivo] = useState<boolean | undefined>(true);

  const { data, isLoading } = useLoans({ page, limit: 20, activo });
  const { data: locations } = useLocationTree();
  const createMutation = useCreateLoan();
  const returnMutation = useReturnLoan();

  // Modal nuevo préstamo
  const [modal, setModal] = useState<ModalType>(null);
  const [selectedLoanId, setSelectedLoanId] = useState<number | null>(null);
  const [modalError, setModalError] = useState('');

  // Form nuevo préstamo
  const [newForm, setNewForm] = useState({
    serie: '', ciudadId: '', seccionId: '', oficinaId: '',
    solicitanteFicha: '', motivo: '',
  });

  // Form devolución
  const [devueltoPorFicha, setDevueltoPorFicha] = useState('');

  function openNuevo() {
    setNewForm({ serie: '', ciudadId: '', seccionId: '', oficinaId: '', solicitanteFicha: '', motivo: '' });
    setModalError('');
    setModal('nuevo');
  }

  function openDevolucion(id: number) {
    setSelectedLoanId(id);
    setDevueltoPorFicha('');
    setModalError('');
    setModal('devolucion');
  }

  function closeModal() { setModal(null); setModalError(''); setSelectedLoanId(null); }

  function handleNewChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setNewForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'ciudadId') { next.seccionId = ''; next.oficinaId = ''; }
      if (name === 'seccionId') { next.oficinaId = ''; }
      return next;
    });
    setModalError('');
  }

  async function handleCreateLoan(e: React.FormEvent) {
    e.preventDefault();
    const serie = Number(newForm.serie);
    const ficha = Number(newForm.solicitanteFicha);
    const oficina = Number(newForm.oficinaId);

    if (!serie) { setModalError('Ingresá el número de serie del equipo'); return; }
    if (!oficina) { setModalError('Seleccioná la oficina de destino'); return; }
    if (!ficha) { setModalError('Ingresá la ficha del solicitante'); return; }

    // Necesitamos el ID del equipo por serie — buscamos via API
    try {
      const result = await api.get<{
        data: { id: number; serie: number; estado: string }[];
      }>(`/equipment?search=${serie}&limit=5`);

      const equipo = result.data?.find((e) => e.serie === serie);
      if (!equipo) { setModalError(`No se encontró ningún equipo con serie ${serie}`); return; }
      if (equipo.estado === 'PRESTADO') { setModalError('El equipo ya está en préstamo'); return; }

      await createMutation.mutateAsync({
        equipoId: equipo.id,
        oficinaDestinoId: oficina,
        solicitanteFicha: ficha,
        motivo: newForm.motivo || undefined,
      });

      closeModal();
    } catch (err: any) {
      setModalError(err?.message || 'Error al crear el préstamo');
    }
  }

  async function handleReturn(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedLoanId) return;
    const ficha = Number(devueltoPorFicha);
    if (!ficha) { setModalError('Ingresá la ficha del funcionario que devuelve'); return; }

    try {
      await returnMutation.mutateAsync({ id: selectedLoanId, devueltoPorFicha: ficha });
      closeModal();
    } catch (err: any) {
      setModalError(err?.message || 'Error al registrar devolución');
    }
  }

  // Cascada ubicación para nuevo préstamo
  const ciudadSel = locations?.find((c) => c.id === Number(newForm.ciudadId));
  const seccionSel = ciudadSel?.secciones.find((s) => s.id === Number(newForm.seccionId));

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <h2 className={styles.pageTitle}>Préstamos</h2>
        <div className={styles.toolbarRight}>
          <div className={styles.filters}>
            <button className={styles.filterBtn} data-active={activo === true} onClick={() => { setActivo(true); setPage(1); }}>Activos</button>
            <button className={styles.filterBtn} data-active={activo === false} onClick={() => { setActivo(false); setPage(1); }}>Devueltos</button>
            <button className={styles.filterBtn} data-active={activo === undefined} onClick={() => { setActivo(undefined); setPage(1); }}>Todos</button>
          </div>
          <button className={styles.addBtn} onClick={openNuevo}>+ Nuevo Préstamo</button>
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
                      {new Date(p.fechaPrestamo).toLocaleString('es-UY', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      {p.fechaDevolucion && (
                        <span className={styles.devolucion}>Dev: {new Date(p.fechaDevolucion).toLocaleString('es-UY', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      )}
                    </td>
                    <td>
                      <span className={styles.badge} data-active={p.activo}>
                        {p.activo ? 'Activo' : 'Devuelto'}
                      </span>
                    </td>
                    <td>
                      {p.activo && (
                        <button className={styles.returnBtn} onClick={() => openDevolucion(p.id)}>
                          Registrar devolución
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {data?.data.length === 0 && (
                  <tr><td colSpan={7} className={styles.empty}>No hay préstamos</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {data && data.pagination.totalPages > 1 && (
            <div className={styles.pagination}>
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={styles.pageBtn}>Anterior</button>
              <span className={styles.pageInfo}>Página {data.pagination.page} de {data.pagination.totalPages} ({data.pagination.total} préstamos)</span>
              <button disabled={page >= data.pagination.totalPages} onClick={() => setPage((p) => p + 1)} className={styles.pageBtn}>Siguiente</button>
            </div>
          )}
        </>
      )}

      {/* ── Modal nuevo préstamo ─────────────────────────────────── */}
      {modal === 'nuevo' && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Nuevo Préstamo</h3>
            {modalError && <p className={styles.modalError}>{modalError}</p>}
            <form onSubmit={handleCreateLoan} className={styles.modalForm}>

              <div className={styles.field}>
                <label className={styles.label}>N° de Serie del equipo *</label>
                <input
                  type="number"
                  name="serie"
                  value={newForm.serie}
                  onChange={handleNewChange}
                  className={styles.input}
                  placeholder="Ej: 1234"
                  autoFocus
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Ficha del solicitante *</label>
                <input
                  type="number"
                  name="solicitanteFicha"
                  value={newForm.solicitanteFicha}
                  onChange={handleNewChange}
                  className={styles.input}
                  placeholder="Número de ficha"
                />
              </div>

              <div className={styles.fieldGroup}>
                <p className={styles.fieldGroupLabel}>Destino del préstamo *</p>
                <div className={styles.field}>
                  <label className={styles.label}>Ciudad</label>
                  <select name="ciudadId" value={newForm.ciudadId} onChange={handleNewChange} className={styles.select}>
                    <option value="">Ciudad...</option>
                    {locations?.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Sección</label>
                  <select name="seccionId" value={newForm.seccionId} onChange={handleNewChange} className={styles.select} disabled={!newForm.ciudadId}>
                    <option value="">Sección...</option>
                    {ciudadSel?.secciones.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Oficina</label>
                  <select name="oficinaId" value={newForm.oficinaId} onChange={handleNewChange} className={styles.select} disabled={!newForm.seccionId}>
                    <option value="">Oficina...</option>
                    {seccionSel?.oficinas.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                  </select>
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Motivo (opcional)</label>
                <input type="text" name="motivo" value={newForm.motivo} onChange={handleNewChange} className={styles.input} placeholder="Motivo del préstamo..." />
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={closeModal}>Cancelar</button>
                <button type="submit" className={styles.confirmBtn} disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Registrando...' : 'Registrar préstamo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal devolución ─────────────────────────────────────── */}
      {modal === 'devolucion' && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Registrar Devolución</h3>
            {modalError && <p className={styles.modalError}>{modalError}</p>}
            <form onSubmit={handleReturn} className={styles.modalForm}>
              <div className={styles.field}>
                <label className={styles.label}>Ficha del funcionario que devuelve *</label>
                <input
                  type="number"
                  value={devueltoPorFicha}
                  onChange={(e) => { setDevueltoPorFicha(e.target.value); setModalError(''); }}
                  className={styles.input}
                  placeholder="Ficha..."
                  autoFocus
                />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={closeModal}>Cancelar</button>
                <button type="submit" className={styles.confirmBtn} disabled={returnMutation.isPending}>
                  {returnMutation.isPending ? 'Guardando...' : 'Confirmar devolución'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
