import { useState, useEffect, useId } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useEquipmentTypes, useNextSerie, useTemplates } from '../hooks/useEquipment';
import { useLocationTree } from '../hooks/useLocations';
import { api } from '../lib/api-client';
import { findSoporteOffice } from '../lib/find-soporte-office';
import LocationCascadeSelect from '../components/LocationCascadeSelect';
import { usePageTitle } from '../hooks/usePageTitle';
import styles from './BulkEquipmentPage.module.css';

interface SharedFields {
  tipoEquipoId: string;
  templateId: string;
  modelo: string;
  ciudadId: string;
  seccionId: string;
  oficinaId: string;
  proveedor: string;
  fechaAdquisicion: string;
  garantiaHasta: string;
  fechaFinVida: string;
  precioCompra: string;
  observacion: string;
}

interface EquipmentRow {
  id: string;
  serie: string;
  matricula: string;
  mac: string;
  ip: string;
  error: string;
}

export default function BulkEquipmentPage() {
  usePageTitle('Carga masiva de equipos');
  const navigate = useNavigate();
  const qc = useQueryClient();
  const uid = useId();

  const { data: tipos } = useEquipmentTypes();
  const { data: nextSerieData } = useNextSerie();
  const { data: locations } = useLocationTree();

  const [shared, setShared] = useState<SharedFields>({
    tipoEquipoId: '',
    templateId: '',
    modelo: '',
    ciudadId: '',
    seccionId: '',
    oficinaId: '',
    proveedor: '',
    fechaAdquisicion: '',
    garantiaHasta: '',
    fechaFinVida: '',
    precioCompra: '',
    observacion: '',
  });

  const [qty, setQty] = useState(1);
  const [rows, setRows] = useState<EquipmentRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const { data: templates } = useTemplates(
    shared.tipoEquipoId ? Number(shared.tipoEquipoId) : undefined
  );

  // Pre-seleccionar oficina soporte al cargar ubicaciones
  useEffect(() => {
    if (!locations) return;
    const soporte = findSoporteOffice(locations);
    if (soporte) {
      setShared((p) => ({
        ...p,
        ciudadId: String(soporte.ciudadId),
        seccionId: String(soporte.seccionId),
        oficinaId: String(soporte.oficinaId),
      }));
    }
  }, [locations]);

  // Limpiar templateId si cambia el tipo
  useEffect(() => {
    setShared((p) => ({ ...p, templateId: '' }));
  }, [shared.tipoEquipoId]);

  const nextSerie = nextSerieData?.nextSerie ?? 1;

  function handleSharedChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setShared((p) => ({ ...p, [name]: value }));
    setSubmitError('');
  }

  function generateRows() {
    const n = Math.max(1, Math.min(qty, 200));
    const newRows: EquipmentRow[] = Array.from({ length: n }, (_, i) => ({
      id: `${uid}-${i}-${Date.now()}`,
      serie: String(nextSerie + i),
      matricula: '',
      mac: '',
      ip: '',
      error: '',
    }));
    setRows(newRows);
    setSubmitError('');
  }

  function updateRow(id: string, field: keyof Omit<EquipmentRow, 'id' | 'error'>, value: string) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value, error: '' } : r))
    );
    setSubmitError('');
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  // Detectar series duplicadas dentro del lote
  function getDuplicateSeries(): Set<string> {
    const seen = new Set<string>();
    const dupes = new Set<string>();
    for (const row of rows) {
      const s = row.serie.trim();
      if (s && seen.has(s)) dupes.add(s);
      seen.add(s);
    }
    return dupes;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!shared.tipoEquipoId || !shared.oficinaId) {
      setSubmitError('Tipo de equipo y ubicación son obligatorios');
      return;
    }
    if (rows.length === 0) {
      setSubmitError('Generá al menos una fila de equipos');
      return;
    }

    // Validación client-side: series vacías o duplicadas dentro del lote
    const dupes = getDuplicateSeries();
    let hasClientError = false;
    const checkedRows = rows.map((r) => {
      if (!r.serie.trim() || isNaN(Number(r.serie))) {
        hasClientError = true;
        return { ...r, error: 'Serie requerida y debe ser un número' };
      }
      if (dupes.has(r.serie.trim())) {
        hasClientError = true;
        return { ...r, error: 'Serie duplicada en el lote' };
      }
      return r;
    });

    if (hasClientError) {
      setRows(checkedRows);
      setSubmitError('Corregí los errores en las filas antes de continuar');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    const sharedPayload: Record<string, unknown> = {
      tipoEquipoId: Number(shared.tipoEquipoId),
      oficinaId: Number(shared.oficinaId),
      modelo: shared.modelo || undefined,
      proveedor: shared.proveedor || undefined,
      fechaAdquisicion: shared.fechaAdquisicion || null,
      garantiaHasta: shared.garantiaHasta || null,
      fechaFinVida: shared.fechaFinVida || null,
      precioCompra: shared.precioCompra ? Number(shared.precioCompra) : null,
      observacion: shared.observacion || undefined,
      ...(shared.templateId ? { templateId: Number(shared.templateId) } : {}),
    };

    for (const row of rows) {
      const payload = {
        ...sharedPayload,
        serie: Number(row.serie),
        matricula: row.matricula || undefined,
        mac: row.mac || undefined,
        ip: row.ip || undefined,
      };

      try {
        await api.post('/equipment', payload);
      } catch (err: any) {
        const msg = err?.message || 'Error al crear el equipo';
        setRows((prev) =>
          prev.map((r) => (r.id === row.id ? { ...r, error: msg } : r))
        );
        setSubmitError(`Error en serie ${row.serie}: ${msg}. No se creó ningún equipo.`);
        setIsSubmitting(false);
        return;
      }
    }

    qc.invalidateQueries({ queryKey: ['equipment'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    navigate('/equipos');
  }

  const selectedTemplate = templates?.find((t) => t.id === Number(shared.templateId));
  const duplicateSeries = getDuplicateSeries();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/equipos')}>
          ← Volver
        </button>
        <h2 className={styles.title}>Carga masiva de equipos</h2>
      </div>

      <form onSubmit={handleSubmit}>
        {/* ── Datos compartidos ── */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Datos compartidos (todos los equipos)</h3>

          <div className={styles.grid3}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="tipoEquipoId">Tipo *</label>
              <select
                id="tipoEquipoId"
                name="tipoEquipoId"
                value={shared.tipoEquipoId}
                onChange={handleSharedChange}
                className={styles.select}
                required
              >
                <option value="">Seleccioná un tipo...</option>
                {tipos?.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="templateId">Plantilla (opcional)</label>
              <select
                id="templateId"
                name="templateId"
                value={shared.templateId}
                onChange={handleSharedChange}
                className={styles.select}
              >
                <option value="">Sin plantilla</option>
                {templates?.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="modelo">Modelo</label>
              <input
                id="modelo"
                type="text"
                name="modelo"
                value={shared.modelo}
                onChange={handleSharedChange}
                className={styles.input}
                placeholder="Ej: TP-Link TL-ER7206"
              />
            </div>
          </div>

          {selectedTemplate && (
            <div className={styles.templateCard}>
              <div className={styles.templateCardTitle}>{selectedTemplate.nombre}</div>
              {selectedTemplate.marca && (
                <div className={styles.templateCardRow}>
                  <strong>Marca:</strong> <span>{selectedTemplate.marca}</span>
                </div>
              )}
              {selectedTemplate.especificaciones &&
                Object.entries(selectedTemplate.especificaciones).map(([k, v]) => (
                  <div key={k} className={styles.templateCardRow}>
                    <strong>{k}:</strong> <span>{String(v)}</span>
                  </div>
                ))}
            </div>
          )}

          <div>
            <label className={styles.label}>Ubicación *</label>
            <LocationCascadeSelect
              required
              value={{
                ciudadId: shared.ciudadId,
                seccionId: shared.seccionId,
                oficinaId: shared.oficinaId,
              }}
              onChange={(v) => setShared((p) => ({ ...p, ...v }))}
              onError={(msg) => setSubmitError(msg)}
            />
          </div>

          <div className={styles.grid4}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="proveedor">Proveedor</label>
              <input
                id="proveedor"
                type="text"
                name="proveedor"
                value={shared.proveedor}
                onChange={handleSharedChange}
                className={styles.input}
                placeholder="Ej: TechShop SRL"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="fechaAdquisicion">Fecha adquisición</label>
              <input
                id="fechaAdquisicion"
                type="date"
                name="fechaAdquisicion"
                value={shared.fechaAdquisicion}
                onChange={handleSharedChange}
                className={styles.input}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="garantiaHasta">Garantía hasta</label>
              <input
                id="garantiaHasta"
                type="date"
                name="garantiaHasta"
                value={shared.garantiaHasta}
                onChange={handleSharedChange}
                className={styles.input}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="fechaFinVida">Fin de vida</label>
              <input
                id="fechaFinVida"
                type="date"
                name="fechaFinVida"
                value={shared.fechaFinVida}
                onChange={handleSharedChange}
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.grid3}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="precioCompra">Precio de compra</label>
              <input
                id="precioCompra"
                type="number"
                name="precioCompra"
                value={shared.precioCompra}
                onChange={handleSharedChange}
                className={styles.input}
                placeholder="Ej: 25000"
                step="0.01"
                min="0"
              />
            </div>
            <div className={`${styles.field}`} style={{ gridColumn: 'span 2' }}>
              <label className={styles.label} htmlFor="observacion">Observaciones</label>
              <textarea
                id="observacion"
                name="observacion"
                value={shared.observacion}
                onChange={handleSharedChange}
                className={styles.textarea}
                placeholder="Observaciones comunes a todos los equipos..."
              />
            </div>
          </div>
        </div>

        {/* ── Generador + tabla de equipos ── */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Equipos a crear</h3>

          <div className={styles.generatorRow}>
            <span className={styles.generatorLabel}>Cantidad:</span>
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(Math.max(1, Math.min(200, Number(e.target.value))))}
              className={styles.qtyInput}
              min={1}
              max={200}
            />
            <button type="button" className={styles.generateBtn} onClick={generateRows}>
              Generar filas
            </button>
            {rows.length === 0 && nextSerieData && (
              <span className={styles.serieHint}>
                → Series desde <strong>{nextSerie}</strong>
              </span>
            )}
            {rows.length > 0 && (
              <span className={styles.serieHint}>
                {rows.length} fila{rows.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {rows.length > 0 && (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>#</th>
                    <th style={{ width: 110 }}>Serie *</th>
                    <th>Matrícula</th>
                    <th>MAC</th>
                    <th>IP</th>
                    <th style={{ width: 36 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const isDupe = duplicateSeries.has(row.serie.trim()) && row.serie.trim() !== '';
                    const hasErr = Boolean(row.error) || isDupe;
                    return (
                      <>
                        <tr key={row.id}>
                          <td className={styles.rowNum}>{idx + 1}</td>
                          <td>
                            <input
                              type="number"
                              value={row.serie}
                              onChange={(e) => updateRow(row.id, 'serie', e.target.value)}
                              className={`${styles.rowInput} ${hasErr ? styles.hasError : ''}`}
                              min={1}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={row.matricula}
                              onChange={(e) => updateRow(row.id, 'matricula', e.target.value)}
                              className={styles.rowInput}
                              placeholder="opcional"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={row.mac}
                              onChange={(e) => updateRow(row.id, 'mac', e.target.value)}
                              className={styles.rowInput}
                              placeholder="opcional"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={row.ip}
                              onChange={(e) => updateRow(row.id, 'ip', e.target.value)}
                              className={styles.rowInput}
                              placeholder="opcional"
                            />
                          </td>
                          <td>
                            <button
                              type="button"
                              className={styles.removeBtn}
                              onClick={() => removeRow(row.id)}
                              title="Eliminar fila"
                            >
                              <X size={14} />
                            </button>
                          </td>
                        </tr>
                        {(row.error || isDupe) && (
                          <tr key={`${row.id}-err`}>
                            <td />
                            <td colSpan={5} className={styles.rowError}>
                              {row.error || 'Serie duplicada en el lote'}
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {submitError && <div className={styles.error}>{submitError}</div>}

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={() => navigate('/equipos')}>
            Cancelar
          </button>
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isSubmitting || rows.length === 0}
          >
            {isSubmitting
              ? 'Creando equipos...'
              : `Crear ${rows.length} equipo${rows.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </form>
    </div>
  );
}
