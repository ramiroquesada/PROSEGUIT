import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  useSupplyCategories, useCreateSupplyCategory, useCreateSupply, useUpdateSupply, type Insumo,
} from '../../hooks/useSupplies';
import styles from './supplies.module.css';

interface Props {
  /** Si viene, edita; si no, crea. */
  insumo?: Pick<Insumo, 'id' | 'nombre' | 'unidad' | 'observacion' | 'categoria'>;
  /** Categoría preseleccionada al crear (p. ej. la del filtro activo). */
  categoriaInicial?: number;
  onClose: () => void;
}

const NUEVA = '__nueva__';

export default function SupplyFormModal({ insumo, categoriaInicial, onClose }: Props) {
  const navigate = useNavigate();
  const { data: categorias } = useSupplyCategories();
  const createCategory = useCreateSupplyCategory();
  const createSupply = useCreateSupply();
  const updateSupply = useUpdateSupply();

  const [nombre, setNombre] = useState(insumo?.nombre ?? '');
  const [categoriaId, setCategoriaId] = useState(String(insumo?.categoria.id ?? categoriaInicial ?? ''));
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [unidad, setUnidad] = useState(insumo?.unidad ?? 'unidad');
  const [ingresoInicial, setIngresoInicial] = useState('');
  const [observacion, setObservacion] = useState(insumo?.observacion ?? '');
  const [error, setError] = useState('');

  const pending = createCategory.isPending || createSupply.isPending || updateSupply.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!nombre.trim()) { setError('El nombre es obligatorio'); return; }
    if (!categoriaId) { setError('Elegí una categoría'); return; }
    if (categoriaId === NUEVA && !nuevaCategoria.trim()) { setError('Escribí el nombre de la categoría nueva'); return; }
    const inicial = ingresoInicial ? Number(ingresoInicial) : 0;
    if (!Number.isInteger(inicial) || inicial < 0) { setError('El ingreso inicial debe ser un número entero'); return; }

    try {
      const catId = categoriaId === NUEVA
        ? (await createCategory.mutateAsync({ nombre: nuevaCategoria.trim() })).id
        : Number(categoriaId);

      const datos = {
        nombre: nombre.trim(),
        categoriaId: catId,
        unidad: unidad.trim() || 'unidad',
      };

      if (insumo) {
        await updateSupply.mutateAsync({ id: insumo.id, ...datos, observacion: observacion.trim() || null });
        onClose();
      } else {
        const creado = await createSupply.mutateAsync({
          ...datos,
          observacion: observacion.trim() || undefined,
          ingresoInicial: inicial || undefined,
        });
        onClose();
        navigate(`/insumos/${creado.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog">
        <h3 className={styles.modalTitle}>{insumo ? 'Editar insumo' : 'Nuevo insumo'}</h3>
        {error && <div className={styles.error}>{error}</div>}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="sup-nombre">Nombre *</label>
            <input id="sup-nombre" className={styles.input} value={nombre} maxLength={120} autoFocus
              onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Cable HDMI 1,5 m" />
            <span className={styles.hint}>Un ítem por variante: "Cable HDMI 1,5 m" y "Cable HDMI 3 m" van por separado.</span>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="sup-cat">Categoría *</label>
            <select id="sup-cat" className={styles.select} value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
              <option value="">Elegí una categoría...</option>
              {categorias?.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              <option value={NUEVA}>+ Nueva categoría...</option>
            </select>
            {categoriaId === NUEVA && (
              <input className={styles.input} value={nuevaCategoria} maxLength={60}
                onChange={(e) => setNuevaCategoria(e.target.value)} placeholder="Ej: Cables de video" />
            )}
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="sup-unidad">Unidad</label>
              <input id="sup-unidad" className={styles.input} value={unidad} maxLength={30} list="sup-unidades"
                onChange={(e) => setUnidad(e.target.value)} />
              <datalist id="sup-unidades">
                <option value="unidad" /><option value="caja" /><option value="pack" /><option value="m" /><option value="rollo" />
              </datalist>
            </div>
            {!insumo && (
              <div className={styles.field}>
                <label className={styles.label} htmlFor="sup-inicial">Ingreso inicial</label>
                <input id="sup-inicial" type="number" min={0} step={1} className={styles.input} value={ingresoInicial}
                  onChange={(e) => setIngresoInicial(e.target.value)} placeholder="0" />
              </div>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="sup-obs">Observación</label>
            <textarea id="sup-obs" className={styles.textarea} rows={2} value={observacion}
              onChange={(e) => setObservacion(e.target.value)} placeholder="Compatibilidad, proveedor habitual..." />
          </div>

          <div className={styles.modalActions}>
            <button type="button" className={styles.btn} onClick={onClose}>Cancelar</button>
            <button type="submit" className={styles.btn} data-variant="primary" disabled={pending}>
              {pending ? 'Guardando...' : insumo ? 'Guardar cambios' : 'Crear insumo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
