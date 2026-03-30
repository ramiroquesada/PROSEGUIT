import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useEquipmentDetail, useTransferEquipment, useSendToSupport, useSendToService, useReturnFromService, useUploadEquipmentImage, useDeleteEquipmentImage } from '../hooks/useEquipment';
import { resolveEstado, STATUS_LABEL, STATUS_COLOR } from '../lib/equipment-status';
import { useEquipmentHistory } from '../hooks/useHistory';
import { useLocationTree } from '../hooks/useLocations';
import { useServiceProviders } from '../hooks/useLoans';
import { ACCION_LABEL, ACCION_COLOR } from '../lib/action-types';
import { ArrowRightLeft, Building2, RotateCcw, Pencil, ChevronLeft, LogOut, LogIn, Monitor, Camera, Trash2, Plus, X } from 'lucide-react';
import { findSoporteOffice } from '../lib/find-soporte-office';
import LocationCascadeSelect from '../components/LocationCascadeSelect';
import styles from './EquipmentDetailPage.module.css';
import { usePageTitle } from '../hooks/usePageTitle';

// ── Tipos de modal de acción ───────────────────────────────────────────────
type ActionType = 'salida' | 'entrada' | 'transfer' | 'service' | 'returnService';

interface ActionState {
  type: ActionType;
  motivo: string;
  comentario: string;
  diagnostico: string;
  // Transfer
  ciudadId: string;
  seccionId: string;
  oficinaId: string;
  // Service
  servicioId: string;
}

const INITIAL_ACTION: ActionState = {
  type: 'transfer', motivo: '', comentario: '', diagnostico: '',
  ciudadId: '', seccionId: '', oficinaId: '', servicioId: '',
};

// ── Acciones disponibles por estado ───────────────────────────────────────
const ACCIONES_POR_ESTADO: Record<string, { type: ActionType; label: string; desc: string; variant: string }[]> = {
  NUEVO: [
    { type: 'salida', label: 'SALIDA', desc: 'Asignar a oficina destino', variant: 'primary' },
  ],
  ACTIVO: [
    { type: 'entrada',  label: 'ENTRADA',          desc: 'Retorno temporal a Soporte', variant: 'warning'   },
    { type: 'transfer', label: 'Transferir',        desc: 'Mover a otra oficina',       variant: 'secondary' },
    { type: 'service',  label: 'Servicio Externo',  desc: 'Enviar a reparación',        variant: 'warning'   },
  ],
  EN_REPARACION: [
    { type: 'salida',  label: 'SALIDA',           desc: 'Devolver a su oficina', variant: 'primary' },
    { type: 'service', label: 'Servicio Externo', desc: 'Enviar a reparación',   variant: 'warning' },
  ],
  EN_DEPOSITO: [
    { type: 'salida', label: 'SALIDA', desc: 'Asignar a oficina', variant: 'primary' },
  ],
  EN_SERVICIO_EXTERNO: [
    { type: 'returnService', label: 'Registrar retorno', desc: 'Confirmar regreso del servicio', variant: 'primary' },
  ],
  PRESTADO: [],
};

// ── Iconos por tipo de acción ─────────────────────────────────────────────
const ACCION_ICON: Record<ActionType, React.ComponentType<{ size?: number }>> = {
  salida:        LogOut,
  entrada:       LogIn,
  transfer:      ArrowRightLeft,
  service:       Building2,
  returnService: RotateCcw,
};

// ── Títulos y descripciones de modal ──────────────────────────────────────
const MODAL_CONFIG: Record<ActionType, { title: string; motiLabel: string; placeholder: string; confirmLabel: string; confirmVariant: string; showDiagnostico?: boolean }> = {
  salida: {
    title: 'Salida de Equipo',
    motiLabel: 'Motivo de la salida *',
    placeholder: 'Ej: Asignación a oficina de Tesorería',
    confirmLabel: 'Confirmar salida',
    confirmVariant: 'primary',
  },
  entrada: {
    title: 'Entrada de Equipo a Soporte',
    motiLabel: 'Motivo de la entrada *',
    placeholder: 'Ej: Equipo con falla en fuente de alimentación',
    confirmLabel: 'Confirmar entrada',
    confirmVariant: 'warning',
  },
  transfer: {
    title: 'Transferir Equipo',
    motiLabel: 'Motivo de la transferencia *',
    placeholder: 'Ej: Reubicación por reforma de oficina',
    confirmLabel: 'Confirmar transferencia',
    confirmVariant: 'primary',
  },
  service: {
    title: 'Enviar a Servicio Externo',
    motiLabel: 'Motivo *',
    placeholder: 'Ej: Reparación de fuente de alimentación',
    confirmLabel: 'Confirmar envío',
    confirmVariant: 'warning',
  },
  returnService: {
    title: 'Retorno de Servicio Externo',
    motiLabel: 'Estado al retorno *',
    placeholder: 'Ej: Reparado, listo para uso',
    confirmLabel: 'Confirmar retorno',
    confirmVariant: 'primary',
    showDiagnostico: true,
  },
};

export default function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const equipoId = Number(id);

  const { data: equipo, isLoading } = useEquipmentDetail(equipoId);
  const { data: historial, isLoading: loadingHistory } = useEquipmentHistory(equipoId);
  usePageTitle(equipo ? `Equipo #${equipo.serie}` : 'Equipo');
  const { data: locations } = useLocationTree();
  const { data: servicios } = useServiceProviders();

  const soporteOffice = locations ? findSoporteOffice(locations) : null;

  const transferMutation = useTransferEquipment();
  const supportMutation = useSendToSupport();
  const serviceMutation = useSendToService();
  const returnServiceMutation = useReturnFromService();
  const uploadImageMutation = useUploadEquipmentImage();
  const deleteImageMutation = useDeleteEquipmentImage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [action, setAction] = useState<ActionState | null>(null);
  const [actionError, setActionError] = useState('');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!lightboxUrl) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setLightboxUrl(null); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxUrl]);

  const isPending = transferMutation.isPending || supportMutation.isPending || serviceMutation.isPending || returnServiceMutation.isPending;

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadImageMutation.mutate({ id: equipoId, file });
    e.target.value = '';
  }

  function openAction(type: ActionType) {
    let initial = { ...INITIAL_ACTION, type };

    // Para SALIDA desde EN_REPARACION: pre-rellenar destino con la última oficina origen del ENVIO_SOPORTE
    if (type === 'salida' && equipo && historial && locations) {
      const estado = resolveEstado(equipo.estado, equipo.oficina.nombre);
      if (estado === 'EN_REPARACION') {
        const lastEnvio = historial.find((h) => h.accion === 'ENVIO_SOPORTE');
        const origenId = lastEnvio?.oficinaOrigen?.id;
        if (origenId) {
          outer: for (const ciudad of locations) {
            for (const seccion of ciudad.secciones) {
              if (seccion.oficinas.some((o) => o.id === origenId)) {
                initial = { ...initial, ciudadId: String(ciudad.id), seccionId: String(seccion.id), oficinaId: String(origenId) };
                break outer;
              }
            }
          }
        }
      }
    }

    setAction(initial);
    setActionError('');
  }

  function closeAction() { setAction(null); setActionError(''); }

  function handleActionChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setAction((prev) => prev ? { ...prev, [name]: value } : prev);
    setActionError('');
  }

  async function handleActionSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!action || !equipo) return;

    if (!action.motivo.trim()) { setActionError('El motivo es obligatorio'); return; }

    const base = { id: equipoId, motivo: action.motivo, comentario: action.comentario || undefined };

    try {
      switch (action.type) {
        case 'salida':
        case 'transfer':
          if (!action.oficinaId) { setActionError('Seleccioná la oficina de destino'); return; }
          if (Number(action.oficinaId) === equipo.oficina.id) { setActionError('El destino es la misma oficina actual'); return; }
          await transferMutation.mutateAsync({ ...base, oficinaDestinoId: Number(action.oficinaId) });
          break;
        case 'entrada':
          if (!soporteOffice) { setActionError('No se encontró la oficina de Soporte en el sistema'); return; }
          if (soporteOffice.oficinaId === equipo.oficina.id) { setActionError('El equipo ya está en Soporte'); return; }
          await supportMutation.mutateAsync({ ...base, oficinaDestinoId: soporteOffice.oficinaId });
          break;
        case 'service':
          if (!action.servicioId) { setActionError('Seleccioná el servicio externo'); return; }
          await serviceMutation.mutateAsync({ ...base, servicioId: Number(action.servicioId) });
          break;
        case 'returnService':
          await returnServiceMutation.mutateAsync({
            ...base,
            diagnostico: action.diagnostico || undefined,
          });
          break;
      }
      closeAction();
    } catch (err: any) {
      setActionError(err?.message || 'Error al ejecutar la acción');
    }
  }

  // ── Acciones disponibles para el estado actual ───────────────────────────
  const estadoReal = equipo ? resolveEstado(equipo.estado, equipo.oficina.nombre) : 'ACTIVO';
  const accionesDisponibles = equipo ? (ACCIONES_POR_ESTADO[estadoReal] ?? []) : [];

  // Datos para el bento row
  const lastAction = historial && historial.length > 0
    ? [...historial].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0]
    : null;
  const totalHistorial = historial?.length ?? 0;
  const totalPrestamos = historial?.filter(h => h.accion === 'PRESTAMO').length ?? 0;
  const prestamosActivos = totalPrestamos - (historial?.filter(h => h.accion === 'DEVOLUCION').length ?? 0);

  if (isLoading) return <div className={styles.loading}>Cargando equipo...</div>;
  if (!equipo) return (
    <div className={styles.notFound}>
      <h2>Equipo no encontrado</h2>
      <button onClick={() => navigate(-1)} className={styles.backBtn}>← Volver al listado</button>
    </div>
  );

  const cfg = action ? MODAL_CONFIG[action.type] : null;

  return (
    <div className={styles.page}>
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className={styles.hero}>
        <div className={styles.heroNav}>
          <button className={styles.backBtn} onClick={() => navigate(-1)}>
            <ChevronLeft size={14} />
            Volver a equipos
          </button>
        </div>
        <div className={styles.heroBody}>
          <div className={styles.heroIdentity}>
            <div className={styles.heroIcon}>
              <Monitor size={22} />
            </div>
            <div>
              <div className={styles.heroTitle}>Serie {equipo.serie}</div>
              <div className={styles.heroSubtitle}>
                {equipo.tipoEquipo.nombre}{equipo.template ? ` · ${equipo.template.nombre}` : ''}
              </div>
              <div className={styles.heroLocation}>
                <div className={styles.heroLocationDot} />
                {equipo.oficina.seccion.ciudad.nombre} · {equipo.oficina.seccion.nombre} · {equipo.oficina.nombre}
              </div>
            </div>
          </div>
          <div className={styles.heroRight}>
            <span className={styles.heroBadge} data-color={STATUS_COLOR[estadoReal] || 'neutral'}>
              {STATUS_LABEL[estadoReal] || estadoReal}
            </span>
            <button className={styles.editBtn} onClick={() => navigate(`/equipos/${id}/editar`)}>
              <Pencil size={14} />
              Editar
            </button>
          </div>
        </div>
      </div>

      {/* ── Bento Row ─────────────────────────────────────────────────── */}
      <div className={styles.bentoRow}>
        <div className={`${styles.bentoCell} ${styles.bentoCellHighlight}`}>
          <span className={styles.bentoCellLabel}>📍 Ubicación actual</span>
          <span className={styles.bentoCellValue}>{equipo.oficina.nombre}</span>
          <span className={styles.bentoCellSub}>
            {equipo.oficina.seccion.nombre} · {equipo.oficina.seccion.ciudad.nombre}
          </span>
        </div>
        <div className={styles.bentoCell}>
          <span className={styles.bentoCellLabel}>📋 Última acción</span>
          <span className={styles.bentoCellValue} style={{ color: lastAction ? `var(--color-${ACCION_COLOR[lastAction.accion] === 'primary' ? 'primary' : ACCION_COLOR[lastAction.accion] === 'neutral' ? 'text-secondary' : ACCION_COLOR[lastAction.accion]})` : undefined }}>
            {lastAction ? (ACCION_LABEL[lastAction.accion] || lastAction.accion) : '—'}
          </span>
          <span className={styles.bentoCellSub}>
            {lastAction ? new Date(lastAction.fecha).toLocaleString('es-UY', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Sin registros'}
          </span>
        </div>
        <div className={styles.bentoCell}>
          <span className={styles.bentoCellLabel}>🔄 Préstamos</span>
          <span className={styles.bentoCellValue} style={{ color: prestamosActivos > 0 ? 'var(--color-info)' : 'var(--color-text-tertiary)' }}>
            {prestamosActivos} activo{prestamosActivos !== 1 ? 's' : ''}
          </span>
          <span className={styles.bentoCellSub}>{totalPrestamos} histórico{totalPrestamos !== 1 ? 's' : ''}</span>
        </div>
        <div className={styles.bentoCell}>
          <span className={styles.bentoCellLabel}>🛠 Historial</span>
          <span className={styles.bentoCellValue}>{totalHistorial} acción{totalHistorial !== 1 ? 'es' : ''}</span>
          <span className={styles.bentoCellSub}>
            {historial && historial.length > 0
              ? `desde ${new Date([...historial].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())[0].fecha).getFullYear()}`
              : 'Sin registros'}
          </span>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <div className={styles.pageBody}>
        {/* Card: Información del equipo */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderBar} style={{ background: 'var(--color-primary)' }} />
            <h3 className={styles.cardTitle}>Información del equipo</h3>
          </div>
          <dl className={styles.details}>
            <div className={styles.detailRow}><dt>Tipo</dt><dd>{equipo.tipoEquipo.nombre}</dd></div>
            {equipo.template && <div className={styles.detailRow}><dt>Modelo</dt><dd>{equipo.template.nombre}</dd></div>}
            <div className={styles.detailRow}>
              <dt>Ubicación</dt>
              <dd>{equipo.oficina.seccion.ciudad.nombre} › {equipo.oficina.seccion.nombre} › {equipo.oficina.nombre}</dd>
            </div>
            {equipo.matricula && <div className={styles.detailRow}><dt>Matrícula</dt><dd className={styles.mono}>{equipo.matricula}</dd></div>}
            {equipo.asignadoA && <div className={styles.detailRow}><dt>Asignado a</dt><dd>{equipo.asignadoA}</dd></div>}
            {equipo.ip && <div className={styles.detailRow}><dt>IP</dt><dd className={styles.mono}>{equipo.ip}</dd></div>}
            {equipo.mac && <div className={styles.detailRow}><dt>MAC</dt><dd className={styles.mono}>{equipo.mac}</dd></div>}
            {equipo.nroInventario && <div className={styles.detailRow}><dt>N° Inventario</dt><dd>{equipo.nroInventario}</dd></div>}
            {equipo.proveedor && <div className={styles.detailRow}><dt>Proveedor</dt><dd>{equipo.proveedor}</dd></div>}
            {equipo.fechaAdquisicion && (
              <div className={styles.detailRow}>
                <dt>Adquirido</dt>
                <dd>{new Date(equipo.fechaAdquisicion).toLocaleDateString('es-UY')}</dd>
              </div>
            )}
            {equipo.garantiaHasta && (
              <div className={styles.detailRow}>
                <dt>Garantía hasta</dt>
                <dd className={new Date(equipo.garantiaHasta) < new Date() ? styles.garantiaVencida : styles.garantiaVigente}>
                  {new Date(equipo.garantiaHasta).toLocaleDateString('es-UY')}
                  {new Date(equipo.garantiaHasta) < new Date() ? ' (vencida)' : ''}
                </dd>
              </div>
            )}
            {equipo.observacion && <div className={styles.detailRow}><dt>Observación</dt><dd>{equipo.observacion}</dd></div>}
            <div className={styles.detailRow}><dt>Registrado</dt><dd>{new Date(equipo.createdAt).toLocaleString('es-UY', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</dd></div>
          </dl>

          {/* Fotos del equipo */}
          <div className={styles.imageSection}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className={styles.imageInput}
              onChange={handleImageChange}
            />
            {(equipo.imagenes.length > 0 || uploadImageMutation.isPending) && (
              <div className={styles.imageGallery}>
                {equipo.imagenes.map((img) => (
                  <div key={img.id} className={styles.imageTile}>
                    <img
                      src={img.url}
                      alt={`Equipo serie ${equipo.serie}`}
                      className={styles.imageTileImg}
                      onClick={() => setLightboxUrl(img.url)}
                    />
                    <button
                      className={styles.imageDeleteBtn}
                      onClick={() => deleteImageMutation.mutate({ equipoId, imageId: img.id })}
                      disabled={deleteImageMutation.isPending}
                      title="Eliminar foto"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                <button
                  className={styles.imageAddTile}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadImageMutation.isPending}
                >
                  {uploadImageMutation.isPending ? <Camera size={20} /> : <Plus size={20} />}
                  <span>{uploadImageMutation.isPending ? 'Subiendo...' : 'Agregar'}</span>
                </button>
              </div>
            )}
            {equipo.imagenes.length === 0 && !uploadImageMutation.isPending && (
              <button
                className={styles.imagePlaceholder}
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera size={20} />
                <span>Agregar foto del equipo</span>
              </button>
            )}
            {uploadImageMutation.isError && (
              <p className={styles.imageError}>{(uploadImageMutation.error as Error).message}</p>
            )}
          </div>
        </div>

        {/* Notices */}
        {estadoReal === 'NUEVO' && (
          <div className={styles.nuevoNotice}>
            Equipo recién ingresado. Realizá una <strong>SALIDA</strong> para asignarlo a su oficina destino.
          </div>
        )}
        {estadoReal === 'EN_DEPOSITO' && (
          <div className={styles.bajaNotice}>
            Equipo en Depósito. Transferilo a una oficina activa para reasignarlo.
          </div>
        )}
        {estadoReal === 'PRESTADO' && (
          <div className={styles.prestamoNotice}>
            Equipo en préstamo. Gestioná la devolución desde la sección de Préstamos.
          </div>
        )}

        {/* Card: Acciones */}
        {accionesDisponibles.length > 0 && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardHeaderBar} style={{ background: 'var(--color-secondary)' }} />
              <h3 className={styles.cardTitle}>Acciones</h3>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.actionsGrid}>
                {accionesDisponibles.map((a) => {
                  const Icon = ACCION_ICON[a.type];
                  return (
                    <button
                      key={a.type}
                      className={styles.actionBtn}
                      data-variant={a.variant}
                      onClick={() => openAction(a.type)}
                    >
                      <div className={styles.actionBtnIcon}>
                        <Icon size={15} />
                      </div>
                      <div className={styles.actionBtnText}>
                        <span className={styles.actionBtnName}>{a.label}</span>
                        <span className={styles.actionBtnDesc}>{a.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Card: Historial */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderBar} style={{ background: 'var(--color-info)' }} />
            <h3 className={styles.cardTitle}>
              Historial de acciones
              {historial && <span className={styles.count}>{historial.length} registros</span>}
            </h3>
          </div>
          <div className={styles.cardBody}>
            {loadingHistory ? (
              <p className={styles.loadingText}>Cargando historial...</p>
            ) : historial && historial.length > 0 ? (
              <div className={styles.timeline}>
                {[...historial].sort((a, b) => {
                  const dateA = new Date(a.fecha).toDateString();
                  const dateB = new Date(b.fecha).toDateString();
                  if (dateA === dateB) {
                    if (a.accion === 'CREACION') return 1;
                    if (b.accion === 'CREACION') return -1;
                  }
                  return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
                }).map((entry, index, arr) => (
                  <div key={entry.id} className={styles.timelineItem}>
                    <div className={styles.timelineLine}>
                      <div className={styles.timelineDot} data-color={ACCION_COLOR[entry.accion] || 'neutral'} />
                      {index < arr.length - 1 && <div className={styles.timelineConnector} />}
                    </div>
                    <div className={styles.timelineContent}>
                      <div className={styles.timelineHeader}>
                        <span className={styles.timelineAccion} data-color={ACCION_COLOR[entry.accion] || 'neutral'}>
                          {ACCION_LABEL[entry.accion] || entry.accion}
                        </span>
                        <span className={styles.timelineFecha}>
                          {new Date(entry.fecha).toLocaleString('es-UY', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className={styles.timelineMotivo}>{entry.motivo}</p>
                      {(entry.oficinaOrigen || entry.oficinaDestino) && (
                        <p className={styles.timelineUbicacion}>
                          {entry.oficinaOrigen && <span>{entry.oficinaOrigen.nombre}</span>}
                          {entry.oficinaOrigen && entry.oficinaDestino && <ArrowRightLeft size={10} />}
                          {entry.oficinaDestino && <span>{entry.oficinaDestino.nombre}</span>}
                        </p>
                      )}
                      <p className={styles.timelineTecnico}>por {entry.usuario.nombre}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.emptyText}>Sin historial registrado</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal de acción ──────────────────────────────────────────────── */}
      {action && cfg && (
        <div className={styles.overlay} onClick={closeAction}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>{cfg.title}</h3>
            <p className={styles.modalEquipo}>
              Equipo: <strong>Serie {equipo.serie}</strong>
              {equipo.modelo && ` — ${equipo.modelo}`}
            </p>

            {actionError && <div className={styles.modalError}>{actionError}</div>}

            <form onSubmit={handleActionSubmit} className={styles.modalForm}>

              {/* Campos específicos por tipo */}
              {action.type === 'entrada' && soporteOffice && (
                <div className={styles.entradaInfo}>
                  El equipo será devuelto a <strong>{soporteOffice.fullPath}</strong>
                </div>
              )}
              {action.type === 'entrada' && !soporteOffice && (
                <div className={styles.modalError}>
                  No se encontró la oficina de Soporte en el sistema. Creala primero en Ubicaciones.
                </div>
              )}

              {(action.type === 'salida' || action.type === 'transfer') && (
                <LocationCascadeSelect
                  required
                  value={{ ciudadId: action.ciudadId, seccionId: action.seccionId, oficinaId: action.oficinaId }}
                  onChange={(v) => setAction((p) => p ? { ...p, ...v } : p)}
                  onError={(msg) => setActionError(msg)}
                />
              )}

              {action.type === 'service' && (
                <div className={styles.field}>
                  <label className={styles.label}>Servicio externo *</label>
                  <select name="servicioId" value={action.servicioId} onChange={handleActionChange} className={styles.select}>
                    <option value="">Seleccioná...</option>
                    {servicios?.filter((s) => s.activo).map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
              )}

              {/* Diagnóstico opcional para retorno de servicio */}
              {cfg.showDiagnostico && (
                <div className={styles.field}>
                  <label className={styles.label}>Diagnóstico del servicio</label>
                  <textarea
                    name="diagnostico"
                    value={action.diagnostico}
                    onChange={handleActionChange}
                    className={styles.textarea}
                    rows={2}
                    placeholder="Qué repararon, qué partes cambiaron..."
                  />
                </div>
              )}

              {/* Motivo (siempre) */}
              <div className={styles.field}>
                <label className={styles.label}>{cfg.motiLabel}</label>
                <textarea
                  name="motivo"
                  value={action.motivo}
                  onChange={handleActionChange}
                  className={styles.textarea}
                  rows={3}
                  placeholder={cfg.placeholder}
                  required
                />
              </div>

              {/* Comentario opcional */}
              <div className={styles.field}>
                <label className={styles.label}>Comentario adicional</label>
                <input
                  type="text"
                  name="comentario"
                  value={action.comentario}
                  onChange={handleActionChange}
                  className={styles.input}
                  placeholder="Observaciones opcionales..."
                />
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={closeAction}>Cancelar</button>
                <button
                  type="submit"
                  className={styles.confirmBtn}
                  data-variant={cfg.confirmVariant}
                  disabled={isPending}
                >
                  {isPending ? 'Procesando...' : cfg.confirmLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Lightbox ─────────────────────────────────────────────────────── */}
      {lightboxUrl && (
        <div className={styles.lightboxOverlay} onClick={() => setLightboxUrl(null)}>
          <button className={styles.lightboxClose} onClick={() => setLightboxUrl(null)} aria-label="Cerrar">
            <X size={20} />
          </button>
          <img
            src={lightboxUrl}
            className={styles.lightboxImg}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
