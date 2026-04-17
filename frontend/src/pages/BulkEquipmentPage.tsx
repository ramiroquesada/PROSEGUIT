import React, { use, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Trash2 } from 'lucide-react';
import { AuthContext } from '../lib/auth-context';
import { apiClient } from '../lib/api-client';
import { useEquipmentTypes } from '../hooks/useEquipmentTypes';
import { useNextSerie } from '../hooks/useNextSerie';
import { useTemplates } from '../hooks/useTemplates';
import { useLocationTree } from '../hooks/useLocationTree';
import { LocationCascadeSelect } from '../components/LocationCascadeSelect';
import { CascadeValue } from '@proseguit/shared/types';
import styles from './BulkEquipmentPage.module.css';
import { useQueryClient } from '@tanstack/react-query';

interface Row {
  id: string;
  serie: number;
  matricula: string;
  mac: string;
  ip: string;
  error?: string;
  success?: boolean;
}

export const BulkEquipmentPage: React.FC = () => {
  const auth = use(AuthContext)!;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Shared fields state
  const [tipoId, setTipoId] = useState<string>('');
  const [templateId, setTemplateId] = useState<string>('');
  const [location, setLocation] = useState<CascadeValue | null>(null);
  const [locationError, setLocationError] = useState<string>('');
  const [rowCount, setRowCount] = useState<number>(5);

  // Rows state
  const [rows, setRows] = useState<Row[]>([]);

  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);

  // Data hooks
  const { data: tipos = [] } = useEquipmentTypes();
  const { data: nextSerie = 1000 } = useNextSerie();
  const { data: templates = [] } = useTemplates();
  const { data: locationTree } = useLocationTree();

  // Validation states
  const [tipoError, setTipoError] = useState<string>('');
  const [templateError, setTemplateError] = useState<string>('');

  // Generate rows
  const handleGenerateRows = () => {
    if (!tipoId) {
      setTipoError('Tipo de equipo requerido');
      return;
    }
    if (!templateId) {
      setTemplateError('Plantilla requerida');
      return;
    }
    if (!location?.oficina) {
      setLocationError('Ubicación requerida');
      return;
    }
    if (rowCount < 1 || rowCount > 100) {
      return;
    }

    setTipoError('');
    setTemplateError('');
    setLocationError('');

    const newRows: Row[] = [];
    for (let i = 0; i < rowCount; i++) {
      newRows.push({
        id: `${Date.now()}-${i}`,
        serie: nextSerie + i,
        matricula: '',
        mac: '',
        ip: '',
      });
    }
    setRows(newRows);
  };

  // Update row field
  const handleRowChange = (id: string, field: 'serie' | 'matricula' | 'mac' | 'ip', value: string | number) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]: field === 'serie' ? Number(value) : value,
              error: undefined, // Clear error when user edits
              success: undefined,
            }
          : row
      )
    );
  };

  // Delete row
  const handleDeleteRow = (id: string) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  // Submit
  const handleSubmit = async () => {
    if (rows.length === 0) return;
    if (!tipoId || !templateId || !location?.oficina) return;

    setIsSubmitting(true);
    setSubmitProgress(0);

    try {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        try {
          // Validate row
          if (!row.serie) {
            throw new Error('Serie requerida');
          }
          if (row.serie < 1000 || row.serie > 9999) {
            throw new Error('Serie debe estar entre 1000 y 9999');
          }

          // POST /equipment
          const response = await apiClient.post('/equipment', {
            tipoId,
            templateId,
            serie: row.serie,
            matricula: row.matricula || null,
            mac: row.mac || null,
            ip: row.ip || null,
            ciudadId: location.ciudad,
            seccionId: location.seccion,
            oficinaId: location.oficina,
          });

          // Mark row as success
          setRows((prev) =>
            prev.map((r) =>
              r.id === row.id
                ? {
                    ...r,
                    success: true,
                    error: undefined,
                  }
                : r
            )
          );
        } catch (error) {
          // Mark row with error
          const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
          setRows((prev) =>
            prev.map((r) =>
              r.id === row.id
                ? {
                    ...r,
                    error: errorMsg,
                    success: false,
                  }
                : r
            )
          );

          // Stop on first error
          setIsSubmitting(false);
          setSubmitProgress((i / rows.length) * 100);
          return;
        }

        // Update progress
        setSubmitProgress(((i + 1) / rows.length) * 100);
      }

      // All success
      await queryClient.invalidateQueries({ queryKey: ['equipment'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      // Navigate to list
      navigate('/equipos');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel
  const handleCancel = () => {
    navigate(-1);
  };

  const selectedType = tipos.find((t) => t.id === tipoId);
  const selectedTemplate = templates.find((t) => t.id === templateId);

  const canGenerateRows = tipoId && templateId && location?.oficina && rowCount >= 1 && rowCount <= 100;
  const canSubmit = rows.length > 0 && !isSubmitting;

  return (
    <div className={styles.container}>
      {/* Shared Fields Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Campos compartidos</h2>

        <div className={styles.formGrid}>
          {/* Tipo */}
          <div className={styles.formGroup}>
            <label htmlFor="tipo-select" className={`${styles.label} ${styles.required}`}>
              Tipo de equipo
            </label>
            <select
              id="tipo-select"
              className={styles.select}
              value={tipoId}
              onChange={(e) => {
                setTipoId(e.target.value);
                setTipoError('');
              }}
              disabled={isSubmitting}
            >
              <option value="">Seleccionar...</option>
              {tipos.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.nombre}
                </option>
              ))}
            </select>
            {tipoError && <div className={styles.error}>{tipoError}</div>}
          </div>

          {/* Plantilla */}
          <div className={styles.formGroup}>
            <label htmlFor="template-select" className={`${styles.label} ${styles.required}`}>
              Plantilla de modelo
            </label>
            <select
              id="template-select"
              className={styles.select}
              value={templateId}
              onChange={(e) => {
                setTemplateId(e.target.value);
                setTemplateError('');
              }}
              disabled={isSubmitting}
            >
              <option value="">Seleccionar...</option>
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.nombre}
                </option>
              ))}
            </select>
            {templateError && <div className={styles.error}>{templateError}</div>}
          </div>

          {/* Ubicación */}
          <div className={styles.locationCascadeWrapper}>
            <label className={`${styles.label} ${styles.required}`}>Ubicación</label>
            <LocationCascadeSelect
              value={location}
              onChange={setLocation}
              onError={setLocationError}
              disabled={isSubmitting}
              required
            />
            {locationError && <div className={styles.cascadeError}>{locationError}</div>}
          </div>
        </div>

        {/* Template Reference Card */}
        {selectedTemplate && (
          <div className={styles.templateRefCard}>
            <div className={styles.templateRefCardTitle}>Datos de plantilla ({selectedTemplate.nombre})</div>
            <div className={styles.templateRefCardContent}>
              {selectedTemplate.specs && Object.entries(selectedTemplate.specs).map(([key, value]) => (
                <div key={key} className={styles.templateRefCardItem}>
                  <div className={styles.templateRefCardLabel}>{key}</div>
                  <div className={styles.templateRefCardValue}>{String(value)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Rows Section */}
      <section className={styles.section}>
        <div className={styles.rowsSectionHeader}>
          <h2 className={styles.sectionTitle}>Equipos a ingresar</h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className={styles.rowCountInfo}>
              {rows.length === 0 ? (
                <span>Ingresá cuántos equipos querés agregar y hacé click en "Generar filas"</span>
              ) : (
                <span>
                  {rows.length} fila{rows.length !== 1 ? 's' : ''} generada{rows.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Generate Row Controls */}
        {rows.length === 0 && (
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className={styles.formGroup}>
              <label htmlFor="row-count-input" className={styles.label}>
                Cantidad de equipos
              </label>
              <input
                id="row-count-input"
                type="number"
                className={styles.input}
                value={rowCount}
                onChange={(e) => setRowCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                disabled={isSubmitting}
                min="1"
                max="100"
              />
            </div>
            <button
              className={styles.generateButton}
              onClick={handleGenerateRows}
              disabled={!canGenerateRows || isSubmitting}
            >
              Generar filas
            </button>
          </div>
        )}

        {/* Table */}
        {rows.length > 0 && (
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.rowIndexCell}>#</th>
                    <th>Serie</th>
                    <th>Matrícula</th>
                    <th>MAC</th>
                    <th>IP</th>
                    <th>Estado</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.id}>
                      <td className={styles.rowIndexCell}>{index + 1}</td>
                      <td>
                        <input
                          type="number"
                          className={styles.tableInput}
                          value={row.serie}
                          onChange={(e) => handleRowChange(row.id, 'serie', e.target.value)}
                          disabled={isSubmitting || row.success}
                          min="1000"
                          max="9999"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className={styles.tableInput}
                          value={row.matricula}
                          onChange={(e) => handleRowChange(row.id, 'matricula', e.target.value)}
                          placeholder="Ej: MAT123"
                          disabled={isSubmitting || row.success}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className={styles.tableInput}
                          value={row.mac}
                          onChange={(e) => handleRowChange(row.id, 'mac', e.target.value)}
                          placeholder="Ej: AA:BB:CC:DD:EE:FF"
                          disabled={isSubmitting || row.success}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className={styles.tableInput}
                          value={row.ip}
                          onChange={(e) => handleRowChange(row.id, 'ip', e.target.value)}
                          placeholder="Ej: 192.168.1.1"
                          disabled={isSubmitting || row.success}
                        />
                      </td>
                      <td className={row.error ? styles.rowErrorCell : row.success ? styles.rowSuccessCell : ''}>
                        {row.error && <span title={row.error}>❌ {row.error}</span>}
                        {row.success && <span>✓ Creado</span>}
                        {!row.error && !row.success && <span>—</span>}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className={styles.deleteButton}
                          onClick={() => handleDeleteRow(row.id)}
                          disabled={isSubmitting || row.success}
                          title="Eliminar fila"
                        >
                          <Trash2 size={14} style={{ display: 'inline' }} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Progress Bar */}
            {isSubmitting && (
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${submitProgress}%` }} />
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {rows.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>📋</div>
            <div className={styles.emptyStateText}>
              Completá los campos compartidos y hacé click en "Generar filas" para comenzar
            </div>
          </div>
        )}
      </section>

      {/* Action Buttons */}
      <div className={styles.actionButtons}>
        <button
          className={styles.cancelButton}
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </button>
        <button
          className={styles.submitButton}
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {isSubmitting ? 'Creando equipos...' : 'Crear equipos'}
        </button>
      </div>

      {/* Loading Overlay */}
      {isSubmitting && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingSpinner}>
            <div className={styles.spinner} />
            <div className={styles.spinnerText}>
              Creando equipos ({Math.round(submitProgress)} de {rows.length})
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
