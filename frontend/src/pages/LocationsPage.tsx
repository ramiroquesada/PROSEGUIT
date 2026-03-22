import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useLocationTree } from '../hooks/useLocations';
import { api } from '../lib/api-client';
import styles from './LocationsPage.module.css';

function useCreateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { type: 'ciudad' | 'seccion' | 'oficina'; nombre: string; ciudadId?: number; seccionId?: number }) => {
      const endpoint = data.type === 'ciudad' ? '/locations/cities' : data.type === 'seccion' ? '/locations/sections' : '/locations/offices';
      return api.post(endpoint, { nombre: data.nombre, ciudadId: data.ciudadId, seccionId: data.seccionId });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['locations-tree'] }),
  });
}

export default function LocationsPage() {
  const { data: tree, isLoading } = useLocationTree();
  const createMutation = useCreateLocation();

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<{ type: 'ciudad' | 'seccion' | 'oficina'; ciudadId?: number; seccionId?: number; parentName?: string } | null>(null);
  const [nombre, setNombre] = useState('');
  const [modalError, setModalError] = useState('');

  function toggleExpand(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) { setModalError('Ingresá un nombre'); return; }
    if (!modal) return;

    try {
      await createMutation.mutateAsync({ type: modal.type, nombre: nombre.trim(), ciudadId: modal.ciudadId, seccionId: modal.seccionId });
      setModal(null);
      setNombre('');
      setModalError('');
    } catch (err: any) {
      setModalError(err?.message || 'Error al crear');
    }
  }

  if (isLoading) return <div className={styles.loading}>Cargando ubicaciones...</div>;

  const totalOficinas = tree?.reduce((acc, c) => acc + c.secciones.reduce((a, s) => a + s.oficinas.length, 0), 0) ?? 0;

  return (
    <div className={styles.page}>
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

      <div className={styles.tree}>
        {tree?.map((ciudad) => (
          <div key={ciudad.id} className={styles.ciudadNode}>
            <div className={styles.ciudadHeader} onClick={() => toggleExpand(`c-${ciudad.id}`)}>
              <span className={styles.toggleIcon}>{expanded.has(`c-${ciudad.id}`) ? '▼' : '▶'}</span>
              <span className={styles.ciudadIcon}>🏙</span>
              <span className={styles.ciudadNombre}>{ciudad.nombre}</span>
              <span className={styles.countBadge}>{ciudad.secciones.reduce((a, s) => a + s.oficinas.length, 0)} oficinas</span>
              <button
                className={styles.addChildBtn}
                onClick={(e) => { e.stopPropagation(); setModal({ type: 'seccion', ciudadId: ciudad.id, parentName: ciudad.nombre }); setNombre(''); setModalError(''); }}
              >
                + Sección
              </button>
            </div>

            {expanded.has(`c-${ciudad.id}`) && (
              <div className={styles.secciones}>
                {ciudad.secciones.map((seccion) => (
                  <div key={seccion.id} className={styles.seccionNode}>
                    <div className={styles.seccionHeader} onClick={() => toggleExpand(`s-${seccion.id}`)}>
                      <span className={styles.toggleIcon}>{expanded.has(`s-${seccion.id}`) ? '▼' : '▶'}</span>
                      <span className={styles.seccionIcon}>🏢</span>
                      <span className={styles.seccionNombre}>{seccion.nombre}</span>
                      <span className={styles.countBadge}>{seccion.oficinas.length} oficinas</span>
                      <button
                        className={styles.addChildBtn}
                        onClick={(e) => { e.stopPropagation(); setModal({ type: 'oficina', seccionId: seccion.id, parentName: seccion.nombre }); setNombre(''); setModalError(''); }}
                      >
                        + Oficina
                      </button>
                    </div>

                    {expanded.has(`s-${seccion.id}`) && (
                      <div className={styles.oficinas}>
                        {seccion.oficinas.map((oficina) => (
                          <div key={oficina.id} className={styles.oficinaNode}>
                            <span className={styles.oficinaIcon}>🚪</span>
                            <span className={styles.oficinaNombre}>{oficina.nombre}</span>
                          </div>
                        ))}
                        {seccion.oficinas.length === 0 && (
                          <p className={styles.emptyNode}>Sin oficinas</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {ciudad.secciones.length === 0 && (
                  <p className={styles.emptyNode}>Sin secciones</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal crear */}
      {modal && (
        <div className={styles.overlay} onClick={() => setModal(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>
              {modal.type === 'ciudad' ? 'Nueva Ciudad' : modal.type === 'seccion' ? 'Nueva Sección' : 'Nueva Oficina'}
            </h3>
            {modal.parentName && (
              <p className={styles.modalParent}>en: {modal.parentName}</p>
            )}
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
