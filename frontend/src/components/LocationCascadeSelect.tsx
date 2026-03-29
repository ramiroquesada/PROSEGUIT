import { useState } from 'react';
import { useLocationTree, useCreateCity, useCreateSection, useCreateOffice } from '../hooks/useLocations';
import styles from './LocationCascadeSelect.module.css';

export interface CascadeValue {
  ciudadId: string;
  seccionId: string;
  oficinaId: string;
}

interface Props {
  value: CascadeValue;
  onChange: (value: CascadeValue) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  onError?: (msg: string) => void;
}

export default function LocationCascadeSelect({ value, onChange, disabled, required, className, onError }: Props) {
  const { data: locations } = useLocationTree();
  const createCity = useCreateCity();
  const createSection = useCreateSection();
  const createOffice = useCreateOffice();

  const [creating, setCreating] = useState<null | 'ciudad' | 'seccion' | 'oficina'>(null);
  const [newNombre, setNewNombre] = useState('');

  const ciudadSel = locations?.find((c) => c.id === Number(value.ciudadId));
  const seccionSel = ciudadSel?.secciones.find((s) => s.id === Number(value.seccionId));

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const { name, value: v } = e.target;
    const next = { ...value, [name]: v };
    if (name === 'ciudadId') { next.seccionId = ''; next.oficinaId = ''; }
    if (name === 'seccionId') { next.oficinaId = ''; }
    onChange(next);
  }

  async function handleCreate(type: 'ciudad' | 'seccion' | 'oficina') {
    const nombre = newNombre.trim();
    if (!nombre) return;
    try {
      if (type === 'ciudad') {
        const city = await createCity.mutateAsync(nombre);
        onChange({ ciudadId: String(city.id), seccionId: '', oficinaId: '' });
      } else if (type === 'seccion') {
        const sec = await createSection.mutateAsync({ nombre, ciudadId: Number(value.ciudadId) });
        onChange({ ...value, seccionId: String(sec.id), oficinaId: '' });
      } else {
        const off = await createOffice.mutateAsync({ nombre, seccionId: Number(value.seccionId) });
        onChange({ ...value, oficinaId: String(off.id) });
      }
      setCreating(null);
      setNewNombre('');
    } catch (err: any) {
      onError?.(err?.message || `Error al crear ${type}`);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent, type: 'ciudad' | 'seccion' | 'oficina') {
    if (e.key === 'Enter') { e.preventDefault(); handleCreate(type); }
    if (e.key === 'Escape') { e.preventDefault(); setCreating(null); }
  }

  const isPendingCreate = createCity.isPending || createSection.isPending || createOffice.isPending;

  return (
    <div className={`${styles.cascade}${className ? ` ${className}` : ''}`}>
      {/* Ciudad */}
      <div className={styles.field}>
        <div className={styles.labelRow}>
          <label className={styles.label}>Ciudad {required && '*'}</label>
          {creating !== 'ciudad' && !disabled && (
            <button type="button" className={styles.newBtn} onClick={() => { setCreating('ciudad'); setNewNombre(''); }}>+ Nueva</button>
          )}
        </div>
        {creating === 'ciudad' ? (
          <div className={styles.inlineCreate}>
            <input autoFocus className={styles.input} value={newNombre} onChange={(e) => setNewNombre(e.target.value)} placeholder="Nombre de la ciudad" onKeyDown={(e) => handleKeyDown(e, 'ciudad')} />
            <button type="button" className={styles.inlineConfirm} onClick={() => handleCreate('ciudad')} disabled={isPendingCreate}>✓</button>
            <button type="button" className={styles.inlineCancel} onClick={() => setCreating(null)}>✕</button>
          </div>
        ) : (
          <select name="ciudadId" value={value.ciudadId} onChange={handleChange} className={styles.select} disabled={disabled} required={required}>
            <option value="">Ciudad...</option>
            {locations?.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        )}
      </div>

      {/* Sección */}
      <div className={styles.field}>
        <div className={styles.labelRow}>
          <label className={styles.label}>Sección {required && '*'}</label>
          {creating !== 'seccion' && value.ciudadId && !disabled && (
            <button type="button" className={styles.newBtn} onClick={() => { setCreating('seccion'); setNewNombre(''); }}>+ Nueva</button>
          )}
        </div>
        {creating === 'seccion' ? (
          <div className={styles.inlineCreate}>
            <input autoFocus className={styles.input} value={newNombre} onChange={(e) => setNewNombre(e.target.value)} placeholder="Nombre de la sección" onKeyDown={(e) => handleKeyDown(e, 'seccion')} />
            <button type="button" className={styles.inlineConfirm} onClick={() => handleCreate('seccion')} disabled={isPendingCreate}>✓</button>
            <button type="button" className={styles.inlineCancel} onClick={() => setCreating(null)}>✕</button>
          </div>
        ) : (
          <select name="seccionId" value={value.seccionId} onChange={handleChange} className={styles.select} disabled={disabled || !value.ciudadId} required={required}>
            <option value="">Sección...</option>
            {ciudadSel?.secciones.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        )}
      </div>

      {/* Oficina */}
      <div className={styles.field}>
        <div className={styles.labelRow}>
          <label className={styles.label}>Oficina {required && '*'}</label>
          {creating !== 'oficina' && value.seccionId && !disabled && (
            <button type="button" className={styles.newBtn} onClick={() => { setCreating('oficina'); setNewNombre(''); }}>+ Nueva</button>
          )}
        </div>
        {creating === 'oficina' ? (
          <div className={styles.inlineCreate}>
            <input autoFocus className={styles.input} value={newNombre} onChange={(e) => setNewNombre(e.target.value)} placeholder="Nombre de la oficina" onKeyDown={(e) => handleKeyDown(e, 'oficina')} />
            <button type="button" className={styles.inlineConfirm} onClick={() => handleCreate('oficina')} disabled={isPendingCreate}>✓</button>
            <button type="button" className={styles.inlineCancel} onClick={() => setCreating(null)}>✕</button>
          </div>
        ) : (
          <select name="oficinaId" value={value.oficinaId} onChange={handleChange} className={styles.select} disabled={disabled || !value.seccionId} required={required}>
            <option value="">Oficina...</option>
            {seccionSel?.oficinas.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </select>
        )}
      </div>
    </div>
  );
}
