import { useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { useSupplyCategories, useCreateSupplyCategory, useUpdateSupplyCategory } from '../../hooks/useSupplies';
import styles from './supplies.module.css';

/** Alta y renombre de categorías de insumos. */
export default function CategoriesModal({ onClose }: { onClose: () => void }) {
  const { data: categorias } = useSupplyCategories();
  const create = useCreateSupplyCategory();
  const update = useUpdateSupplyCategory();
  const [nueva, setNueva] = useState('');
  const [editando, setEditando] = useState<{ id: number; nombre: string } | null>(null);
  const [error, setError] = useState('');

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (!nueva.trim()) return;
    setError('');
    try {
      await create.mutateAsync({ nombre: nueva.trim() });
      setNueva('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear');
    }
  }

  async function guardar() {
    if (!editando || !editando.nombre.trim()) return;
    setError('');
    try {
      await update.mutateAsync({ id: editando.id, nombre: editando.nombre.trim() });
      setEditando(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo renombrar');
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog">
        <h3 className={styles.modalTitle}>Categorías de insumos</h3>
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.categoryList}>
          {categorias?.map((c) => (
            <div key={c.id} className={styles.categoryItem}>
              {editando?.id === c.id ? (
                <>
                  <input
                    className={styles.input}
                    value={editando.nombre}
                    maxLength={60}
                    autoFocus
                    onChange={(e) => setEditando({ id: c.id, nombre: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter') guardar(); if (e.key === 'Escape') setEditando(null); }}
                  />
                  <button className={styles.iconBtn} onClick={guardar} aria-label="Guardar"><Check size={15} /></button>
                  <button className={styles.iconBtn} onClick={() => setEditando(null)} aria-label="Cancelar"><X size={15} /></button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1 }}>{c.nombre}</span>
                  <span className={styles.groupCount}>{c._count.insumos} ítem{c._count.insumos === 1 ? '' : 's'}</span>
                  <button className={styles.iconBtn} onClick={() => setEditando({ id: c.id, nombre: c.nombre })} aria-label={`Renombrar ${c.nombre}`}>
                    <Pencil size={14} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        <form className={styles.inline} onSubmit={crear}>
          <input className={styles.input} value={nueva} maxLength={60} onChange={(e) => setNueva(e.target.value)} placeholder="Nueva categoría" />
          <button type="submit" className={styles.btn} data-variant="primary" disabled={create.isPending || !nueva.trim()}>Agregar</button>
        </form>

        <div className={styles.modalActions}>
          <button type="button" className={styles.btn} onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
