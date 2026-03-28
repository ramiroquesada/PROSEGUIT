import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEquipmentDetail, useEquipmentTypes, useNextSerie } from '../hooks/useEquipment';
import { useLocationTree, useCreateCity, useCreateSection, useCreateOffice } from '../hooks/useLocations';
import { api } from '../lib/api-client';
import { findSoporteOffice } from '../lib/find-soporte-office';
import styles from './EquipmentFormPage.module.css';
import { usePageTitle } from '../hooks/usePageTitle';

export default function EquipmentFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEditing = Boolean(id);
  usePageTitle(isEditing ? 'Editar equipo' : 'Nuevo equipo');
  const equipoId = Number(id);

  const { data: equipo } = useEquipmentDetail(isEditing ? equipoId : 0);
  const { data: tipos } = useEquipmentTypes();
  const { data: locations } = useLocationTree();
  const { data: nextSerieData } = useNextSerie();

  const [form, setForm] = useState({
    serie: '',
    modelo: '',
    tipoEquipoId: '',
    ciudadId: '',
    seccionId: '',
    oficinaId: '',
    ip: '',
    observacion: '',
    motivo: '',
  });

  const [error, setError] = useState('');

  // Creación inline de ubicaciones
  const [creating, setCreating] = useState<null | 'ciudad' | 'seccion' | 'oficina'>(null);
  const [newNombre, setNewNombre] = useState('');

  const createCity = useCreateCity();
  const createSection = useCreateSection();
  const createOffice = useCreateOffice();

  async function handleCreateLocation(type: 'ciudad' | 'seccion' | 'oficina') {
    const nombre = newNombre.trim();
    if (!nombre) return;
    try {
      if (type === 'ciudad') {
        const city = await createCity.mutateAsync(nombre);
        setForm((p) => ({ ...p, ciudadId: String(city.id), seccionId: '', oficinaId: '' }));
      } else if (type === 'seccion') {
        const sec = await createSection.mutateAsync({ nombre, ciudadId: Number(form.ciudadId) });
        setForm((p) => ({ ...p, seccionId: String(sec.id), oficinaId: '' }));
      } else {
        const off = await createOffice.mutateAsync({ nombre, seccionId: Number(form.seccionId) });
        setForm((p) => ({ ...p, oficinaId: String(off.id) }));
      }
      setCreating(null);
      setNewNombre('');
    } catch (err: any) {
      setError(err?.message || 'Error al crear la ubicación');
    }
  }

  function handleInlineKeyDown(e: React.KeyboardEvent, type: 'ciudad' | 'seccion' | 'oficina') {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreateLocation(type);
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setCreating(null);
    }
  }

  // Prellenar al editar
  useEffect(() => {
    if (equipo && isEditing) {
      setForm({
        serie: String(equipo.serie),
        modelo: equipo.modelo || '',
        tipoEquipoId: String(equipo.tipoEquipo.id),
        ciudadId: String(equipo.oficina.seccion.ciudad.id),
        seccionId: String(equipo.oficina.seccion.id),
        oficinaId: String(equipo.oficina.id),
        ip: equipo.ip || '',
        observacion: equipo.observacion || '',
        motivo: '',
      });
    }
  }, [equipo, isEditing]);

  // Pre-rellenar serie con el próximo disponible (solo en creación)
  useEffect(() => {
    if (!isEditing && nextSerieData?.nextSerie) {
      setForm((p) => ({ ...p, serie: String(nextSerieData.nextSerie) }));
    }
  }, [isEditing, nextSerieData]);

  // Pre-seleccionar tipo "PC - Torre" y oficina "soporte" (solo en creación)
  useEffect(() => {
    if (isEditing || !tipos || !locations) return;

    const tipoPCTorre = tipos.find((t) =>
      t.nombre.toLowerCase().replace(/\s+/g, '').includes('pctorre') ||
      t.nombre.toLowerCase().includes('pc - torre') ||
      t.nombre.toLowerCase().includes('pc-torre')
    );

    const soporte = findSoporteOffice(locations);

    setForm((p) => ({
      ...p,
      ...(tipoPCTorre && !p.tipoEquipoId ? { tipoEquipoId: String(tipoPCTorre.id) } : {}),
      ...(soporte && !p.ciudadId ? {
        ciudadId: String(soporte.ciudadId),
        seccionId: String(soporte.seccionId),
        oficinaId: String(soporte.oficinaId),
      } : {}),
    }));
  }, [isEditing, tipos, locations]);

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      isEditing
        ? api.put(`/equipment/${equipoId}`, data)
        : api.post('/equipment', data),
    onSuccess: (result: any) => {
      qc.invalidateQueries({ queryKey: ['equipment'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      navigate(`/equipos/${isEditing ? equipoId : result.id}`);
    },
    onError: (err: any) => {
      setError(err?.message || 'Error al guardar el equipo');
    },
  });

  // Cascada de selects de ubicación
  const ciudadSeleccionada = locations?.find((c) => c.id === Number(form.ciudadId));
  const seccionSeleccionada = ciudadSeleccionada?.secciones.find((s) => s.id === Number(form.seccionId));

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'ciudadId') { next.seccionId = ''; next.oficinaId = ''; }
      if (name === 'seccionId') { next.oficinaId = ''; }
      return next;
    });
    setError('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.serie || !form.tipoEquipoId || !form.oficinaId) {
      setError('Serie, tipo y ubicación son obligatorios');
      return;
    }
    if (isEditing && !form.motivo.trim()) {
      setError('Ingresá un motivo para el cambio');
      return;
    }

    const payload: Record<string, unknown> = {
      tipoEquipoId: Number(form.tipoEquipoId),
      oficinaId: Number(form.oficinaId),
      modelo: form.modelo || undefined,
      ip: form.ip || undefined,
      observacion: form.observacion || undefined,
    };

    if (!isEditing) {
      payload.serie = Number(form.serie);
    }

    if (isEditing) {
      payload.motivo = form.motivo;
    }

    mutation.mutate(payload);
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(isEditing ? `/equipos/${id}` : '/equipos')}>
          ← Volver
        </button>
        <h2 className={styles.title}>
          {isEditing ? `Editar equipo #${form.serie}` : 'Nuevo Equipo'}
        </h2>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Datos del Equipo</h3>

          <div className={styles.grid2}>
            <div className={styles.field}>
              <label className={styles.label}>N° de Serie *</label>
              <input
                type="number"
                name="serie"
                value={form.serie}
                onChange={handleChange}
                disabled={isEditing}
                className={styles.input}
                placeholder="Ej: 12345"
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Tipo *</label>
              <select name="tipoEquipoId" value={form.tipoEquipoId} onChange={handleChange} className={styles.select} required>
                <option value="">Seleccioná un tipo...</option>
                {tipos?.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Modelo</label>
              <input
                type="text"
                name="modelo"
                value={form.modelo}
                onChange={handleChange}
                className={styles.input}
                placeholder="Ej: HP EliteDesk 800 G5"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Dirección IP</label>
              <input
                type="text"
                name="ip"
                value={form.ip}
                onChange={handleChange}
                className={styles.input}
                placeholder="Ej: 192.168.1.100"
              />
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Ubicación *</h3>

          <div className={styles.grid3}>
            {/* Ciudad */}
            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label className={styles.label}>Ciudad</label>
                {creating !== 'ciudad' && (
                  <button type="button" className={styles.newBtn} onClick={() => { setCreating('ciudad'); setNewNombre(''); }}>+ Nueva</button>
                )}
              </div>
              {creating === 'ciudad' ? (
                <div className={styles.inlineCreate}>
                  <input autoFocus className={styles.input} value={newNombre} onChange={(e) => setNewNombre(e.target.value)} placeholder="Nombre de la ciudad" onKeyDown={(e) => handleInlineKeyDown(e, 'ciudad')} />
                  <button type="button" className={styles.inlineConfirm} onClick={() => handleCreateLocation('ciudad')} disabled={createCity.isPending}>✓</button>
                  <button type="button" className={styles.inlineCancel} onClick={() => setCreating(null)}>✕</button>
                </div>
              ) : (
                <select name="ciudadId" value={form.ciudadId} onChange={handleChange} className={styles.select} required>
                  <option value="">Ciudad...</option>
                  {locations?.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              )}
            </div>

            {/* Sección */}
            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label className={styles.label}>Sección</label>
                {creating !== 'seccion' && form.ciudadId && (
                  <button type="button" className={styles.newBtn} onClick={() => { setCreating('seccion'); setNewNombre(''); }}>+ Nueva</button>
                )}
              </div>
              {creating === 'seccion' ? (
                <div className={styles.inlineCreate}>
                  <input autoFocus className={styles.input} value={newNombre} onChange={(e) => setNewNombre(e.target.value)} placeholder="Nombre de la sección" onKeyDown={(e) => handleInlineKeyDown(e, 'seccion')} />
                  <button type="button" className={styles.inlineConfirm} onClick={() => handleCreateLocation('seccion')} disabled={createSection.isPending}>✓</button>
                  <button type="button" className={styles.inlineCancel} onClick={() => setCreating(null)}>✕</button>
                </div>
              ) : (
                <select name="seccionId" value={form.seccionId} onChange={handleChange} className={styles.select} disabled={!form.ciudadId} required>
                  <option value="">Sección...</option>
                  {ciudadSeleccionada?.secciones.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              )}
            </div>

            {/* Oficina */}
            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label className={styles.label}>Oficina</label>
                {creating !== 'oficina' && form.seccionId && (
                  <button type="button" className={styles.newBtn} onClick={() => { setCreating('oficina'); setNewNombre(''); }}>+ Nueva</button>
                )}
              </div>
              {creating === 'oficina' ? (
                <div className={styles.inlineCreate}>
                  <input autoFocus className={styles.input} value={newNombre} onChange={(e) => setNewNombre(e.target.value)} placeholder="Nombre de la oficina" onKeyDown={(e) => handleInlineKeyDown(e, 'oficina')} />
                  <button type="button" className={styles.inlineConfirm} onClick={() => handleCreateLocation('oficina')} disabled={createOffice.isPending}>✓</button>
                  <button type="button" className={styles.inlineCancel} onClick={() => setCreating(null)}>✕</button>
                </div>
              ) : (
                <select name="oficinaId" value={form.oficinaId} onChange={handleChange} className={styles.select} disabled={!form.seccionId} required>
                  <option value="">Oficina...</option>
                  {seccionSeleccionada?.oficinas.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                </select>
              )}
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Observaciones</h3>
          <div className={styles.field}>
            <textarea
              name="observacion"
              value={form.observacion}
              onChange={handleChange}
              className={styles.textarea}
              rows={3}
              placeholder="Observaciones adicionales..."
            />
          </div>
        </div>

        {isEditing && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Motivo del cambio *</h3>
            <div className={styles.field}>
              <textarea
                name="motivo"
                value={form.motivo}
                onChange={handleChange}
                className={styles.textarea}
                rows={2}
                placeholder="Describí el motivo de la modificación..."
                required
              />
              <span className={styles.hint}>Requerido para auditoría</span>
            </div>
          </div>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={() => navigate(isEditing ? `/equipos/${id}` : '/equipos')}
          >
            Cancelar
          </button>
          <button type="submit" className={styles.submitBtn} disabled={mutation.isPending}>
            {mutation.isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear equipo'}
          </button>
        </div>
      </form>
    </div>
  );
}
