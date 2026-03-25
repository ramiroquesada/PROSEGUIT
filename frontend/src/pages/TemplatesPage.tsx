import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEquipmentTypes } from '../hooks/useEquipment';
import { api } from '../lib/api-client';
import styles from './TemplatesPage.module.css';
import { usePageTitle } from '../hooks/usePageTitle';


interface Template {
  id: number;
  nombre: string;
  marca: string | null;
  tipoEquipo: { id: number; nombre: string };
  especificaciones: Record<string, string> | null;
}

function useTemplates(tipoEquipoId?: number) {
  const params = tipoEquipoId ? `?tipoEquipoId=${tipoEquipoId}` : '';
  return useQuery({
    queryKey: ['templates', tipoEquipoId],
    queryFn: () => api.get<Template[]>(`/model-templates${params}`),
  });
}

export default function TemplatesPage() {
  usePageTitle('Plantillas');
  const qc = useQueryClient();
  const { data: tipos } = useEquipmentTypes();
  const [filterTipo, setFilterTipo] = useState<number | undefined>();
  const { data: templates, isLoading } = useTemplates(filterTipo);

  const [modal, setModal] = useState<{ editing?: Template } | null>(null);
  const [form, setForm] = useState({ nombre: '', marca: '', tipoEquipoId: '', specs: '' });
  const [formError, setFormError] = useState('');

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post<Template>('/model-templates', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }); setModal(null); },
    onError: (e: any) => setFormError(e?.message || 'Error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/model-templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
    onError: (e: any) => alert(e?.message || 'No se puede eliminar'),
  });

  function openCreate() {
    setForm({ nombre: '', marca: '', tipoEquipoId: '', specs: '' });
    setFormError('');
    setModal({});
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setFormError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre || !form.tipoEquipoId) { setFormError('Nombre y tipo son obligatorios'); return; }

    let especificaciones: Record<string, string> | undefined;
    if (form.specs.trim()) {
      try {
        especificaciones = JSON.parse(form.specs);
      } catch {
        setFormError('Las especificaciones deben ser JSON válido');
        return;
      }
    }

    createMutation.mutate({
      nombre: form.nombre,
      marca: form.marca || undefined,
      tipoEquipoId: Number(form.tipoEquipoId),
      especificaciones,
    });
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
                <button
                  className={styles.deleteBtn}
                  onClick={() => { if (confirm(`¿Eliminar "${t.nombre}"?`)) deleteMutation.mutate(t.id); }}
                  title="Eliminar plantilla"
                >
                  ×
                </button>
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

      {/* Modal crear */}
      {modal !== null && (
        <div className={styles.overlay} onClick={() => setModal(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Nueva Plantilla</h3>
            {formError && <p className={styles.modalError}>{formError}</p>}
            <form onSubmit={handleSubmit} className={styles.modalForm}>
              <div className={styles.field}>
                <label className={styles.label}>Nombre *</label>
                <input name="nombre" value={form.nombre} onChange={handleChange} className={styles.input} placeholder="Ej: HP EliteDesk 800 G5" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Tipo *</label>
                <select name="tipoEquipoId" value={form.tipoEquipoId} onChange={handleChange} className={styles.input}>
                  <option value="">Seleccioná...</option>
                  {tipos?.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Marca</label>
                <input name="marca" value={form.marca} onChange={handleChange} className={styles.input} placeholder="Ej: HP" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Especificaciones (JSON opcional)</label>
                <textarea name="specs" value={form.specs} onChange={handleChange} className={styles.textarea} rows={4}
                  placeholder={'{\n  "RAM": "8GB",\n  "Disco": "256GB SSD"\n}'} />
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
