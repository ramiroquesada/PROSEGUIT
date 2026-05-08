import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  useLocationTree, useEquipmentByOficina,
  useCreateCity, useCreateSection, useCreateOffice,
  useRenameCity, useRenameSection, useRenameOffice,
  useDeleteCity, useDeleteSection, useDeleteOffice,
  useMoveOffice, useMoveSection,
} from '../hooks/useLocations';
import { resolveEstado, STATUS_LABEL, STATUS_COLOR } from '../lib/equipment-status';
import { Pencil, Trash2, GripVertical, Plus, X, Check } from 'lucide-react';
import TypeBadge from '../components/ui/TypeBadge';
import styles from './LocationsPage.module.css';
import { usePageTitle } from '../hooks/usePageTitle';

type EditTarget = { type: 'ciudad' | 'seccion' | 'oficina'; id: number; value: string };
type ConfirmTarget = { type: 'ciudad' | 'seccion' | 'oficina'; id: number };
type DragItem = { type: 'office' | 'section'; id: number };

export default function LocationsPage() {
  usePageTitle('Ubicaciones');
  const navigate = useNavigate();
  const { data: tree, isLoading } = useLocationTree();

  // Selection (drives column filter cascade)
  const [selCiudadId, setSelCiudadId] = useState<number | null>(null);
  const [selSeccionId, setSelSeccionId] = useState<number | null>(null);
  const [selOficinaId, setSelOficinaId] = useState<number | null>(null);

  // Inline editing (one at a time across all columns)
  const [editing, setEditing] = useState<EditTarget | null>(null);

  // Delete confirm + error
  const [confirming, setConfirming] = useState<ConfirmTarget | null>(null);
  const [deleteError, setDeleteError] = useState('');

  // Add row state
  const [adding, setAdding] = useState<'ciudad' | 'seccion' | 'oficina' | null>(null);
  const [addName, setAddName] = useState('');
  const [addError, setAddError] = useState('');

  // Drag and drop
  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);

  // Equipment panel
  const { data: equiposData, isLoading: loadingEquipos } = useEquipmentByOficina(selOficinaId);

  // Derived data
  const selectedCiudad = tree?.find((c) => c.id === selCiudadId) ?? null;
  const selectedSeccion = selectedCiudad?.secciones.find((s) => s.id === selSeccionId) ?? null;
  const selectedOficina = selectedSeccion?.oficinas.find((o) => o.id === selOficinaId) ?? null;

  // Mutations
  const createCity = useCreateCity();
  const createSection = useCreateSection();
  const createOffice = useCreateOffice();
  const renameCity = useRenameCity();
  const renameSection = useRenameSection();
  const renameOffice = useRenameOffice();
  const deleteCity = useDeleteCity();
  const deleteSection = useDeleteSection();
  const deleteOffice = useDeleteOffice();
  const moveOffice = useMoveOffice();
  const moveSection = useMoveSection();

  const totalSecciones = tree?.reduce((a, c) => a + c.secciones.length, 0) ?? 0;
  const totalOficinas = tree?.reduce((a, c) => a + c.secciones.reduce((b, s) => b + s.oficinas.length, 0), 0) ?? 0;

  // ── Helpers ────────────────────────────────────────────────────────────────

  function startAdding(type: 'ciudad' | 'seccion' | 'oficina') {
    setAdding(type);
    setAddName('');
    setAddError('');
    setEditing(null);
    setConfirming(null);
    setDeleteError('');
  }

  function startEditing(type: 'ciudad' | 'seccion' | 'oficina', id: number, value: string) {
    setEditing({ type, id, value });
    setConfirming(null);
    setDeleteError('');
  }

  function startConfirm(type: 'ciudad' | 'seccion' | 'oficina', id: number) {
    setConfirming({ type, id });
    setDeleteError('');
    setEditing(null);
  }

  // ── Handlers ───────────────────────────────────────────────────────────────

  async function handleAdd() {
    const nombre = addName.trim();
    if (!nombre) { setAddError('Ingresá un nombre'); return; }
    try {
      if (adding === 'ciudad') {
        const city = await createCity.mutateAsync(nombre);
        setSelCiudadId(city.id); setSelSeccionId(null); setSelOficinaId(null);
      } else if (adding === 'seccion' && selCiudadId) {
        const sec = await createSection.mutateAsync({ nombre, ciudadId: selCiudadId });
        setSelSeccionId(sec.id); setSelOficinaId(null);
      } else if (adding === 'oficina' && selSeccionId) {
        const off = await createOffice.mutateAsync({ nombre, seccionId: selSeccionId });
        setSelOficinaId(off.id);
      }
      setAdding(null);
    } catch (err: any) {
      setAddError(err?.message || 'Error al crear');
    }
  }

  async function handleRename() {
    if (!editing) return;
    const nombre = editing.value.trim();
    if (!nombre) { setEditing(null); return; }
    try {
      if (editing.type === 'ciudad') await renameCity.mutateAsync({ id: editing.id, nombre });
      else if (editing.type === 'seccion') await renameSection.mutateAsync({ id: editing.id, nombre });
      else await renameOffice.mutateAsync({ id: editing.id, nombre });
    } catch { /* silent — tree refetches to original */ }
    setEditing(null);
  }

  async function handleDelete() {
    if (!confirming) return;
    setDeleteError('');
    try {
      if (confirming.type === 'ciudad') {
        await deleteCity.mutateAsync(confirming.id);
        if (selCiudadId === confirming.id) { setSelCiudadId(null); setSelSeccionId(null); setSelOficinaId(null); }
      } else if (confirming.type === 'seccion') {
        await deleteSection.mutateAsync(confirming.id);
        if (selSeccionId === confirming.id) { setSelSeccionId(null); setSelOficinaId(null); }
      } else {
        await deleteOffice.mutateAsync(confirming.id);
        if (selOficinaId === confirming.id) setSelOficinaId(null);
      }
      setConfirming(null);
    } catch (err: any) {
      setDeleteError(err?.message || 'No se pudo eliminar');
    }
  }

  async function handleDrop(targetType: 'section' | 'city', targetId: number) {
    if (!dragItem) return;
    try {
      if (dragItem.type === 'office' && targetType === 'section' && targetId !== selSeccionId) {
        await moveOffice.mutateAsync({ id: dragItem.id, seccionId: targetId });
        if (selOficinaId === dragItem.id) setSelOficinaId(null);
      } else if (dragItem.type === 'section' && targetType === 'city' && targetId !== selCiudadId) {
        await moveSection.mutateAsync({ id: dragItem.id, ciudadId: targetId });
        if (selSeccionId === dragItem.id) { setSelSeccionId(null); setSelOficinaId(null); }
      }
    } catch { /* tree refetches to original */ }
  }

  function handleDragEnd() {
    setDragItem(null);
    setDragOverId(null);
  }

  // ── Render helpers ─────────────────────────────────────────────────────────

  function renderEditInput(target: EditTarget) {
    return (
      <input
        autoFocus
        className={styles.inlineInput}
        value={target.value}
        onChange={(e) => setEditing({ ...target, value: e.target.value })}
        onBlur={handleRename}
        onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditing(null); }}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  function renderActions(type: 'ciudad' | 'seccion' | 'oficina', id: number, nombre: string) {
    return (
      <div className={styles.itemActions}>
        <button
          className={styles.iconBtn}
          title="Renombrar"
          onClick={(e) => { e.stopPropagation(); startEditing(type, id, nombre); }}
        >
          <Pencil size={13} />
        </button>
        <button
          className={`${styles.iconBtn} ${styles.danger}`}
          title="Eliminar"
          onClick={(e) => { e.stopPropagation(); startConfirm(type, id); }}
        >
          <Trash2 size={13} />
        </button>
      </div>
    );
  }

  function renderConfirm() {
    return (
      <div className={styles.confirmRow} onClick={(e) => e.stopPropagation()}>
        <span className={styles.confirmText}>¿Eliminar?</span>
        <button className={styles.confirmYes} onClick={handleDelete}>Sí</button>
        <button className={styles.confirmNo} onClick={() => { setConfirming(null); setDeleteError(''); }}>No</button>
      </div>
    );
  }

  function renderAddRow(type: 'ciudad' | 'seccion' | 'oficina') {
    const placeholder = type === 'ciudad' ? 'Nombre de la ciudad' : type === 'seccion' ? 'Nombre de la sección' : 'Nombre de la oficina';
    const isPending = type === 'ciudad' ? createCity.isPending : type === 'seccion' ? createSection.isPending : createOffice.isPending;
    return (
      <div className={styles.addRow}>
        <input
          autoFocus
          className={styles.addInput}
          value={addName}
          placeholder={placeholder}
          onChange={(e) => { setAddName(e.target.value); setAddError(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(null); }}
        />
        <button className={styles.iconBtn} onClick={handleAdd} disabled={isPending}><Check size={14} /></button>
        <button className={styles.iconBtn} onClick={() => setAdding(null)}><X size={14} /></button>
        {addError && <span className={styles.addError}>{addError}</span>}
      </div>
    );
  }

  if (isLoading) return <div className={styles.loading}>Cargando ubicaciones...</div>;

  return (
    <div className={styles.page}>
      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div className={styles.toolbar}>
        <div>
          <h2 className={styles.pageTitle}>Ubicaciones</h2>
          <p className={styles.subtitle}>
            {tree?.length ?? 0} ciudades · {totalSecciones} secciones · {totalOficinas} oficinas
          </p>
        </div>
      </div>

      {/* ── Columns ───────────────────────────────────────────────────────── */}
      <div className={styles.columns} data-panel-open={selOficinaId !== null}>

        {/* ── Col 1: Ciudades ─────────────────────────────────────────────── */}
        <div className={styles.column}>
          <div className={styles.colHeader}>
            <span className={styles.colTitle}>Ciudad</span>
            <span className={styles.colCount}>{tree?.length ?? 0}</span>
            <button className={styles.addColBtn} title="Nueva ciudad" onClick={() => startAdding('ciudad')}>
              <Plus size={14} />
            </button>
          </div>
          <div
            className={styles.colBody}
            data-drag-accept={dragItem?.type === 'section' ? 'true' : undefined}
          >
            {!tree?.length && <p className={styles.emptyState}>Sin ciudades</p>}

            {tree?.map((ciudad) => {
              const isSel = selCiudadId === ciudad.id;
              const isEdit = editing?.type === 'ciudad' && editing.id === ciudad.id;
              const isConf = confirming?.type === 'ciudad' && confirming.id === ciudad.id;
              const isDropOver = dragItem?.type === 'section' && dragOverId === ciudad.id;

              return (
                <div key={ciudad.id}>
                  <div
                    className={styles.itemRow}
                    data-selected={isSel}
                    data-drop-over={isDropOver}
                    onClick={isEdit || isConf ? undefined : () => {
                      setSelCiudadId(ciudad.id); setSelSeccionId(null); setSelOficinaId(null);
                      setEditing(null); setConfirming(null); setDeleteError('');
                    }}
                    onDragOver={dragItem?.type === 'section' ? (e) => { e.preventDefault(); setDragOverId(ciudad.id); } : undefined}
                    onDragLeave={dragItem?.type === 'section' ? (e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverId(null); } : undefined}
                    onDrop={dragItem?.type === 'section' ? (e) => { e.preventDefault(); handleDrop('city', ciudad.id); } : undefined}
                  >
                    {/* Cities are not draggable — hidden handle for alignment */}
                    <span className={styles.dragHandle} style={{ visibility: 'hidden' }}><GripVertical size={14} /></span>

                    {isEdit ? renderEditInput(editing!) : (
                      <span className={styles.itemName}>{ciudad.nombre}</span>
                    )}

                    <span className={styles.itemCount}>{ciudad.secciones.length}</span>

                    {!isEdit && !isConf && renderActions('ciudad', ciudad.id, ciudad.nombre)}
                    {isConf && renderConfirm()}
                  </div>
                  {isConf && deleteError && <div className={styles.deleteError}>{deleteError}</div>}
                </div>
              );
            })}

            {adding === 'ciudad' && renderAddRow('ciudad')}
          </div>
        </div>

        {/* ── Col 2: Secciones ────────────────────────────────────────────── */}
        <div className={styles.column}>
          <div className={styles.colHeader}>
            <span className={styles.colTitle}>Sección</span>
            <span className={styles.colCount}>{selectedCiudad?.secciones.length ?? 0}</span>
            {selCiudadId && (
              <button className={styles.addColBtn} title="Nueva sección" onClick={() => startAdding('seccion')}>
                <Plus size={14} />
              </button>
            )}
          </div>
          <div
            className={styles.colBody}
            data-drag-accept={dragItem?.type === 'office' ? 'true' : undefined}
          >
            {!selCiudadId ? (
              <p className={styles.emptyState}>Seleccioná una ciudad</p>
            ) : selectedCiudad?.secciones.length === 0 ? (
              <p className={styles.emptyState}>Sin secciones</p>
            ) : selectedCiudad?.secciones.map((seccion) => {
              const isSel = selSeccionId === seccion.id;
              const isEdit = editing?.type === 'seccion' && editing.id === seccion.id;
              const isConf = confirming?.type === 'seccion' && confirming.id === seccion.id;
              const isDragging = dragItem?.type === 'section' && dragItem.id === seccion.id;
              const isDropOver = dragItem?.type === 'office' && dragOverId === seccion.id;

              return (
                <div key={seccion.id}>
                  <div
                    className={styles.itemRow}
                    data-selected={isSel}
                    data-dragging={isDragging}
                    data-drop-over={isDropOver}
                    draggable={!isEdit && !isConf}
                    onDragStart={() => setDragItem({ type: 'section', id: seccion.id })}
                    onDragEnd={handleDragEnd}
                    onDragOver={dragItem?.type === 'office' ? (e) => { e.preventDefault(); setDragOverId(seccion.id); } : undefined}
                    onDragLeave={dragItem?.type === 'office' ? (e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverId(null); } : undefined}
                    onDrop={dragItem?.type === 'office' ? (e) => { e.preventDefault(); handleDrop('section', seccion.id); } : undefined}
                    onClick={isEdit || isConf ? undefined : () => {
                      setSelSeccionId(seccion.id); setSelOficinaId(null);
                      setEditing(null); setConfirming(null); setDeleteError('');
                    }}
                  >
                    <span className={styles.dragHandle}><GripVertical size={14} /></span>

                    {isEdit ? renderEditInput(editing!) : (
                      <span className={styles.itemName}>{seccion.nombre}</span>
                    )}

                    <span className={styles.itemCount}>{seccion.oficinas.length}</span>

                    {!isEdit && !isConf && renderActions('seccion', seccion.id, seccion.nombre)}
                    {isConf && renderConfirm()}
                  </div>
                  {isConf && deleteError && <div className={styles.deleteError}>{deleteError}</div>}
                </div>
              );
            })}

            {adding === 'seccion' && selCiudadId && renderAddRow('seccion')}
          </div>
        </div>

        {/* ── Col 3: Oficinas ─────────────────────────────────────────────── */}
        <div className={styles.column}>
          <div className={styles.colHeader}>
            <span className={styles.colTitle}>Oficina</span>
            <span className={styles.colCount}>{selectedSeccion?.oficinas.length ?? 0}</span>
            {selSeccionId && (
              <button className={styles.addColBtn} title="Nueva oficina" onClick={() => startAdding('oficina')}>
                <Plus size={14} />
              </button>
            )}
          </div>
          <div className={styles.colBody}>
            {!selSeccionId ? (
              <p className={styles.emptyState}>Seleccioná una sección</p>
            ) : selectedSeccion?.oficinas.length === 0 ? (
              <p className={styles.emptyState}>Sin oficinas</p>
            ) : selectedSeccion?.oficinas.map((oficina) => {
              const isSel = selOficinaId === oficina.id;
              const isEdit = editing?.type === 'oficina' && editing.id === oficina.id;
              const isConf = confirming?.type === 'oficina' && confirming.id === oficina.id;
              const isDragging = dragItem?.type === 'office' && dragItem.id === oficina.id;

              return (
                <div key={oficina.id}>
                  <div
                    className={styles.itemRow}
                    data-selected={isSel}
                    data-dragging={isDragging}
                    draggable={!isEdit && !isConf}
                    onDragStart={() => setDragItem({ type: 'office', id: oficina.id })}
                    onDragEnd={handleDragEnd}
                    onClick={isEdit || isConf ? undefined : () => {
                      setSelOficinaId(oficina.id === selOficinaId ? null : oficina.id);
                      setEditing(null); setConfirming(null); setDeleteError('');
                    }}
                  >
                    <span className={styles.dragHandle}><GripVertical size={14} /></span>

                    {isEdit ? renderEditInput(editing!) : (
                      <span className={styles.itemName}>{oficina.nombre}</span>
                    )}

                    {!isEdit && !isConf && renderActions('oficina', oficina.id, oficina.nombre)}
                    {isConf && renderConfirm()}
                  </div>
                  {isConf && deleteError && <div className={styles.deleteError}>{deleteError}</div>}
                </div>
              );
            })}

            {adding === 'oficina' && selSeccionId && renderAddRow('oficina')}
          </div>
        </div>

        {/* ── Panel: Equipos de la oficina ─────────────────────────────────── */}
        {selOficinaId && selectedOficina && (
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelBreadcrumb}>{selectedCiudad?.nombre} › {selectedSeccion?.nombre}</p>
                <h3 className={styles.panelTitle}>{selectedOficina.nombre}</h3>
              </div>
              <button className={styles.panelClose} onClick={() => setSelOficinaId(null)}>
                <X size={16} />
              </button>
            </div>

            {loadingEquipos ? (
              <p className={styles.panelLoading}>Cargando...</p>
            ) : equiposData && equiposData.data.length > 0 ? (
              <>
                <p className={styles.panelCount}>{equiposData.pagination.total} equipos</p>
                <div className={styles.equipoList}>
                  {equiposData.data.map((eq) => {
                    const est = resolveEstado(eq.estado, selectedOficina.nombre);
                    return (
                      <div key={eq.id} className={styles.equipoItem} onClick={() => navigate(`/equipos/${eq.id}`)}>
                        <div className={styles.equipoInfo}>
                          <span className={styles.equipoSerie}>Serie {eq.serie}</span>
                          {eq.modelo && <span className={styles.equipoModelo}>{eq.modelo}</span>}
                          <TypeBadge label={eq.tipoEquipo.nombre} />
                          {eq.ip && <span className={styles.equipoIp}>{eq.ip}</span>}
                        </div>
                        <span className={styles.statusBadge} data-color={STATUS_COLOR[est] || 'neutral'}>
                          {STATUS_LABEL[est] || est}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <button className={styles.verTodosBtn} onClick={() => navigate(`/equipos?oficinaId=${selOficinaId}`)}>
                  Ver todos en listado →
                </button>
              </>
            ) : (
              <div className={styles.panelEmpty}>
                <p>Sin equipos en esta oficina.</p>
                <button className={styles.addEquipoBtn} onClick={() => navigate('/equipos/nuevo')}>
                  + Registrar equipo
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
