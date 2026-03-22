import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocationTree, useEquipmentByOficina } from '../hooks/useLocations';
import { api } from '../lib/api-client';
import styles from './LocationsPage.module.css';

const STATUS_LABEL: Record<string, string> = {
  ACTIVO: 'Activo', EN_REPARACION: 'En Reparación', DADO_DE_BAJA: 'Dado de Baja',
  EN_DEPOSITO: 'En Depósito', PRESTADO: 'Prestado', EN_SERVICIO_EXTERNO: 'En Servicio Externo',
};
const STATUS_COLOR: Record<string, string> = {
  ACTIVO: 'success', EN_REPARACION: 'warning', DADO_DE_BAJA: 'danger',
  EN_DEPOSITO: 'info', PRESTADO: 'warning', EN_SERVICIO_EXTERNO: 'info',
};

function useCreateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { type: 'ciudad' | 'seccion' | 'oficina'; nombre: string; ciudadId?: number; seccionId?: number }) => {
      const endpoint = data.type === 'ciudad' ? '/locations/cities'
        : data.type === 'seccion' ? '/locations/sections' : '/locations/offices';
      return api.post(endpoint, { nombre: data.nombre, ciudadId: data.ciudadId, seccionId: data.seccionId });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['locations-tree'] }),
  });
}

interface SelectedOficina { id: number; nombre: string; seccionNombre: string; ciudadNombre: string; }

export default function LocationsPage() {
  const navigate = useNavigate();
  const { data: tree, isLoading } = useLocationTree();
  const createMutation = useCreateLocation();

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedOficina, setSelectedOficina] = useState<SelectedOficina | null>(null);
  const [modal, setModal] = useState<{ type: 'ciudad' | 'seccion' | 'oficina'; ciudadId?: number; seccionId?: number; parentName?: string } | null>(null);
  const [nombre, setNombre] = useState('');
  const [modalError, setModalError] = useState('');

  const { data: equiposOficina, isLoading: loadingEquipos } = useEquipmentByOficina(selectedOficina?.id ?? null);

  function toggleExpand(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function selectOficina(oficina: SelectedOficina) {
    setSelectedOficina((prev) => prev?.id === oficina.id ? null : oficina);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim() || !modal) { setModalError('Ingresá un nombre'); return; }
    try {
      await createMutation.mutateAsync({ type: modal.type, nombre: nombre.trim(), ciudadId: modal.ciudadId, seccionId: modal.seccionId });
      setModal(null); setNombre(''); setModalError('');
    } catch (err: any) {
      setModalError(err?.message || 'Error al crear');
    }
  }

  if (isLoading) return <div className={styles.loading}>Cargando ubicaciones...</div>;

  const totalOficinas = tree?.reduce((a, c) => a + c.secciones.reduce((b, s) => b + s.oficinas.length, 0), 0) ?? 0;

  return (
    <div className={styles.page}>
      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className={styles.toolbar}>
        <div>
          <h2 className={styles.pageTitle}>Ubicaciones</h2>
          <p className={styles.subtitle}>
            {tree?.length ?? 0} ciudades · {tree?.reduce((a, c) => a + c.secciones.length, 0) ?? 0} secciones · {totalOficinas} oficinas
          </p>
        </div>
        <button className={styles.addBtn} onClick={() => { setModal({ type: 'ciudad' }); setNombre(''); setModalError(''); }}>
          + Nueva Ciudad
        </button>
      </div>

      {/* ── Layout: árbol + panel de equipos ──────────────────── */}
      <div className={styles.layout} data-panel-open={selectedOficina !== null}>
        {/* Árbol */}
        <div className={styles.tree}>
          {tree?.map((ciudad) => (
            <div key={ciudad.id} className={styles.ciudadNode}>
              <div className={styles.ciudadHeader} onClick={() => toggleExpand(`c-${ciudad.id}`)}>
                <span className={styles.toggleIcon}>{expanded.has(`c-${ciudad.id}`) ? '▼' : '▶'}</span>
                <span className={styles.nodeIcon}>🏙</span>
                <span className={styles.ciudadNombre}>{ciudad.nombre}</span>
                <span className={styles.countBadge}>{ciudad.secciones.reduce((a, s) => a + s.oficinas.length, 0)} equipos en zona</span>
                <button className={styles.addChildBtn} onClick={(e) => {
                  e.stopPropagation();
                  setModal({ type: 'seccion', ciudadId: ciudad.id, parentName: ciudad.nombre });
                  setNombre(''); setModalError('');
                }}>+ Sección</button>
              </div>

              {expanded.has(`c-${ciudad.id}`) && (
                <div className={styles.secciones}>
                  {ciudad.secciones.length === 0 && <p className={styles.emptyNode}>Sin secciones</p>}
                  {ciudad.secciones.map((seccion) => (
                    <div key={seccion.id} className={styles.seccionNode}>
                      <div className={styles.seccionHeader} onClick={() => toggleExpand(`s-${seccion.id}`)}>
                        <span className={styles.toggleIcon}>{expanded.has(`s-${seccion.id}`) ? '▼' : '▶'}</span>
                        <span className={styles.nodeIcon}>🏢</span>
                        <span className={styles.seccionNombre}>{seccion.nombre}</span>
                        <span className={styles.countBadge}>{seccion.oficinas.length} oficinas</span>
                        <button className={styles.addChildBtn} onClick={(e) => {
                          e.stopPropagation();
                          setModal({ type: 'oficina', seccionId: seccion.id, parentName: seccion.nombre });
                          setNombre(''); setModalError('');
                        }}>+ Oficina</button>
                      </div>

                      {expanded.has(`s-${seccion.id}`) && (
                        <div className={styles.oficinas}>
                          {seccion.oficinas.length === 0 && <p className={styles.emptyNode}>Sin oficinas</p>}
                          {seccion.oficinas.map((oficina) => (
                            <div
                              key={oficina.id}
                              className={styles.oficinaNode}
                              data-selected={selectedOficina?.id === oficina.id}
                              onClick={() => selectOficina({
                                id: oficina.id,
                                nombre: oficina.nombre,
                                seccionNombre: seccion.nombre,
                                ciudadNombre: ciudad.nombre,
                              })}
                            >
                              <span className={styles.nodeIcon}>🚪</span>
                              <span className={styles.oficinaNombre}>{oficina.nombre}</span>
                              <span className={styles.verBtn}>Ver equipos →</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Panel de equipos de la oficina ─────────────────── */}
        {selectedOficina && (
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelBreadcrumb}>{selectedOficina.ciudadNombre} › {selectedOficina.seccionNombre}</p>
                <h3 className={styles.panelTitle}>{selectedOficina.nombre}</h3>
              </div>
              <button className={styles.panelClose} onClick={() => setSelectedOficina(null)}>✕</button>
            </div>

            {loadingEquipos ? (
              <p className={styles.panelLoading}>Cargando...</p>
            ) : equiposOficina && equiposOficina.data.length > 0 ? (
              <>
                <p className={styles.panelCount}>{equiposOficina.pagination.total} equipos</p>
                <div className={styles.equipoList}>
                  {equiposOficina.data.map((eq) => (
                    <div
                      key={eq.id}
                      className={styles.equipoItem}
                      onClick={() => navigate(`/equipos/${eq.id}`)}
                    >
                      <div className={styles.equipoInfo}>
                        <span className={styles.equipoSerie}>Serie {eq.serie}</span>
                        {eq.modelo && <span className={styles.equipoModelo}>{eq.modelo}</span>}
                        <span className={styles.equipoTipo}>{eq.tipoEquipo.nombre}</span>
                        {eq.ip && <span className={styles.equipoIp}>{eq.ip}</span>}
                      </div>
                      <span className={styles.statusBadge} data-color={STATUS_COLOR[eq.estado] || 'neutral'}>
                        {STATUS_LABEL[eq.estado] || eq.estado}
                      </span>
                    </div>
                  ))}
                </div>
                <button className={styles.verTodosBtn} onClick={() => navigate(`/equipos?oficinaId=${selectedOficina.id}`)}>
                  Ver todos en listado →
                </button>
              </>
            ) : (
              <div className={styles.panelEmpty}>
                <p>Sin equipos registrados en esta oficina.</p>
                <button className={styles.addEquipoBtn} onClick={() => navigate('/equipos/nuevo')}>
                  + Registrar equipo aquí
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal crear ─────────────────────────────────────────── */}
      {modal && (
        <div className={styles.overlay} onClick={() => setModal(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>
              {modal.type === 'ciudad' ? 'Nueva Ciudad' : modal.type === 'seccion' ? 'Nueva Sección' : 'Nueva Oficina'}
            </h3>
            {modal.parentName && <p className={styles.modalParent}>en: {modal.parentName}</p>}
            {modalError && <p className={styles.modalError}>{modalError}</p>}
            <form onSubmit={handleCreate} className={styles.modalForm}>
              <div className={styles.field}>
                <label className={styles.label}>Nombre *</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => { setNombre(e.target.value); setModalError(''); }}
                  className={styles.input}
                  autoFocus
                  placeholder={modal.type === 'ciudad' ? 'Ej: Mercedes' : modal.type === 'seccion' ? 'Ej: Informática' : 'Ej: Oficina 3'}
                />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className={styles.confirmBtn} disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
