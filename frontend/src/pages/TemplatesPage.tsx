import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import { useEquipmentTypes, useTemplates, type Template } from '../hooks/useEquipment';
import { api } from '../lib/api-client';
import styles from './TemplatesPage.module.css';
import { usePageTitle } from '../hooks/usePageTitle';

type ModalMode = 'crear' | 'editar' | null;

function specsToRecord(specs: { key: string; value: string }[]): Record<string, string> | undefined {
  const filtered = specs.filter((s) => s.key.trim() !== '');
  if (filtered.length === 0) return undefined;
  const record: Record<string, string> = {};
  for (const { key, value } of filtered) {
    record[key.trim()] = value.trim();
  }
  return record;
}

function recordToSpecs(record: Record<string, unknown> | null | undefined): { key: string; value: string }[] {
  if (!record) return [];
  return Object.entries(record).map(([key, value]) => ({ key, value: String(value) }));
}

export default function TemplatesPage() {
  usePageTitle('Plantillas');
  const qc = useQueryClient();
  const { data: tipos } = useEquipmentTypes();
  const [filterTipo, setFilterTipo] = useState<number | undefined>();
  const { data: templates, isLoading } = useTemplates(filterTipo);

  const [modal, setModal] = useState<ModalMode>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ nombre: '', marca: '', tipoEquipoId: '' });
  const [specs, setSpecs] = useState<{ key: string; value: string }[]>([]);
  const [formError, setFormError] = useState('');

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post<Template>('/model-templates', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
      qc.invalidateQueries({ queryKey: ['equipment'] });
      closeModal();
    },
    onError: (e: any) => setFormError(e?.message || 'Error al crear la plantilla'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      api.put<Template>(`/model-templates/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
      qc.invalidateQueries({ queryKey: ['equipment'] });
      closeModal();
    },
    onError: (e: any) => setFormError(e?.message || 'Error al guardar los cambios'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/model-templates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
      qc.invalidateQueries({ queryKey: ['equipment'] });
    },
    onError: (e: any) => alert(e?.message || 'No se puede eliminar'),
  });

  function openCreate() {
    setForm({ nombre: '', marca: '', tipoEquipoId: '' });
    setSpecs([]);
    setEditingId(null);
    setFormError('');
    setModal('crear');
  }

  function openEdit(t: Template) {
    setForm({
      nombre: t.nombre,
      marca: t.marca ?? '',
      tipoEquipoId: String(t.tipoEquipo.id),
    });
    setSpecs(recordToSpecs(t.especificaciones));
    setEditingId(t.id);
    setFormError('');
    setModal('editar');
  }

  function closeModal() {
    setModal(null);
    setEditingId(null);
    setFormError('');
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setFormError('');
  }

  function handleSpecAdd() {
    setSpecs((prev) => [...prev, { key: '', value: '' }]);
  }

  function handleSpecRemove(index: number) {
    setSpecs((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSpecChange(index: number, field: 'key' | 'value', newValue: string) {
    setSpecs((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: newValue } : row))
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    if (!form.nombre.trim() || !form.tipoEquipoId) {
      setFormError('Nombre y tipo son obligatorios');
      return;
    }

    // Validar claves duplicadas
    const keys = specs.map((s) => s.key.trim()).filter(Boolean);
    const hasDuplicates = keys.length !== new Set(keys).size;
    if (hasDuplicates) {
      setFormError('Hay claves duplicadas en las especificaciones. Renombralas antes de guardar.');
      return;
    }

    const payload = {
      nombre: form.nombre.trim(),
      marca: form.marca.trim() || undefined,
      tipoEquipoId: Number(form.tipoEquipoId),
      especificaciones: specsToRecord(specs),
    };

    if (modal === 'crear') {
      createMutation.mutate(payload);
    } else if (modal === 'editar' && editingId !== null) {
      updateMutation.mutate({ id: editingId, data: payload });
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <h2 className={styles.pageTitle}>Plantillas de Modelo</h2>
        <div className={styles.toolbarRight}>
          <select
            value={filterTipo ?? ''}
            onChange={(e) => setFilterTipo(e.target.value ? Number(e.target.value) : undefined)}
            className={styles.select}
          >
            <option value="">Todos los tipos</option>
            {tipos?.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
          <button className={styles.addBtn} onClick={openCreate}>+ Nueva Plantilla</button>
        </div>
      </div>

      {isLoading ? (
        <div className={styles.loading}>Cargando plantillas...</div>
      ) : templates?.length === 0 ? (
        <div className={styles.empty}>
          <p>No hay plantillas cargadas.</p>
          <button className={styles.addBtn} onClick={openCreate}>Crear primera plantilla</button>
        </div>
      ) : (
        <div className={styles.grid}>
          {templates?.map((t) => (
            <div key={t.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.tipoBadge}>{t.tipoEquipo.nombre}</span>
                <div className={styles.cardActions}>
                  <button
                    className={styles.editBtn}
                    onClick={() => openEdit(t)}
                    title="Editar plantilla"
                    aria-label="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => { if (confirm(`¿Eliminar "${t.nombre}"?`)) deleteMutation.mutate(t.id); }}
                    title="Eliminar plantilla"
                    aria-label="Eliminar"
                  >
                    ×
                  </button>
                </div>
              </div>
              <h3 className={styles.templateNombre}>{t.nombre}</h3>
              {t.marca && <p className={styles.templateMarca}>{t.marca}</p>}
              {t.especificaciones && Object.keys(t.especificaciones).length > 0 && (
                <dl className={styles.specs}>
                  {Object.entries(t.especificaciones).map(([k, v]) => (
                    <div key={k} className={styles.specRow}>
                      <dt>{k}</dt>
                      <dd>{String(v)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal crear/editar */}
      {modal && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>
              {modal === 'crear' ? 'Nueva Plantilla' : 'Editar Plantilla'}
            </h3>
            {formError && <p className={styles.modalError}>{formError}</p>}
            <form onSubmit={handleSubmit} className={styles.modalForm}>
              <div className={styles.formSection}>
                <h4 className={styles.sectionTitle}>Información básica</h4>
                <div className={styles.field}>
                  <label className={styles.label}>Nombre *</label>
                  <input
                    name="nombre"
                    value={form.nombre}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="Ej: HP EliteDesk 800 G5"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Tipo de equipo *</label>
                  <select
                    name="tipoEquipoId"
                    value={form.tipoEquipoId}
                    onChange={handleChange}
                    className={styles.input}
                  >
                    <option value="">Seleccioná...</option>
                    {tipos?.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  </select>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Marca</label>
                  <input
                    name="marca"
                    value={form.marca}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="Ej: HP"
                  />
                </div>
              </div>

              <div className={styles.formSection}>
                <h4 className={styles.sectionTitle}>Especificaciones</h4>
                <div className={styles.specsEditor}>
                  {specs.length === 0 && (
                    <p className={styles.specsEmpty}>Sin especificaciones. Usá el botón para agregar.</p>
                  )}
                  {specs.map((row, i) => (
                    <div key={i} className={styles.specEditorRow}>
                      <input
                        className={styles.specInput}
                        value={row.key}
                        onChange={(e) => handleSpecChange(i, 'key', e.target.value)}
                        placeholder="Clave (ej: RAM)"
                        aria-label={`Clave de especificación ${i + 1}`}
                      />
                      <input
                        className={styles.specInput}
                        value={row.value}
                        onChange={(e) => handleSpecChange(i, 'value', e.target.value)}
                        placeholder="Valor (ej: 8 GB)"
                        aria-label={`Valor de especificación ${i + 1}`}
                      />
                      <button
                        type="button"
                        className={styles.specRemoveBtn}
                        onClick={() => handleSpecRemove(i)}
                        title="Quitar este campo"
                        aria-label="Quitar especificación"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className={styles.specAddBtn}
                    onClick={handleSpecAdd}
                  >
                    + Agregar campo
                  </button>
                </div>
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={closeModal}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.confirmBtn}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending)
                    ? 'Guardando...'
                    : modal === 'crear' ? 'Crear' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
