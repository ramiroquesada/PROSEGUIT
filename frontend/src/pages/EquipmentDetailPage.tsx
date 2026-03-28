import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useEquipmentDetail, useTransferEquipment, useSendToSupport, useSendToService, useReturnFromService } from '../hooks/useEquipment';
import { resolveEstado, STATUS_LABEL, STATUS_COLOR } from '../lib/equipment-status';
import { useEquipmentHistory } from '../hooks/useHistory';
import { useLocationTree, useCreateCity, useCreateSection, useCreateOffice } from '../hooks/useLocations';
import { useServiceProviders } from '../hooks/useLoans';
import { ArrowRightLeft, Building2, RotateCcw, Pencil, ChevronLeft, LogOut, LogIn } from 'lucide-react';
import { findSoporteOffice } from '../lib/find-soporte-office';
import styles from './EquipmentDetailPage.module.css';
import { usePageTitle } from '../hooks/usePageTitle';

// ── Constantes de display ──────────────────────────────────────────────────
const ACCION_LABEL: Record<string, string> = {
  CREACION: 'Creación', EDICION: 'Edición', TRANSFERENCIA: 'Transferencia',
  ENVIO_SOPORTE: 'Envío a Soporte', RETORNO_SOPORTE: 'Retorno de Soporte',
  ENVIO_SERVICIO_EXTERNO: 'Envío a Servicio Externo', RETORNO_SERVICIO_EXTERNO: 'Retorno de Servicio',
  BAJA: 'Baja', PRESTAMO: 'Préstamo', DEVOLUCION: 'Devolución', CAMBIO_ESTADO: 'Cambio de Estado',
};
const ACCION_COLOR: Record<string, string> = {
  CREACION: 'success', EDICION: 'info', TRANSFERENCIA: 'primary',
  ENVIO_SOPORTE: 'warning', RETORNO_SOPORTE: 'success',
  ENVIO_SERVICIO_EXTERNO: 'warning', RETORNO_SERVICIO_EXTERNO: 'success',
  BAJA: 'danger', PRESTAMO: 'info', DEVOLUCION: 'success', CAMBIO_ESTADO: 'neutral',
};

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
const ACCIONES_POR_ESTADO: Record<string, { type: ActionType; label: string; variant: string }[]> = {
  NUEVO: [
    { type: 'salida', label: 'SALIDA', variant: 'primary' },
  ],
  ACTIVO: [
    { type: 'entrada', label: 'ENTRADA', variant: 'warning' },
    { type: 'transfer', label: 'Transferir', variant: 'secondary' },
    { type: 'service', label: 'Enviar a Servicio Externo', variant: 'warning' },
  ],
  EN_REPARACION: [
    { type: 'salida', label: 'SALIDA', variant: 'primary' },
    { type: 'service', label: 'Enviar a Servicio Externo', variant: 'warning' },
  ],
  EN_DEPOSITO: [
    { type: 'salida', label: 'SALIDA', variant: 'primary' },
  ],
  EN_SERVICIO_EXTERNO: [
    { type: 'returnService', label: 'Registrar retorno de servicio', variant: 'primary' },
  ],
  DADO_DE_BAJA: [],
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

  const [action, setAction] = useState<ActionState | null>(null);
  const [actionError, setActionError] = useState('');

  // Creación inline de ubicaciones en modal de transferencia
  const [creatingLoc, setCreatingLoc] = useState<null | 'ciudad' | 'seccion' | 'oficina'>(null);
  const [newLocNombre, setNewLocNombre] = useState('');
  const createCity = useCreateCity();
  const createSection = useCreateSection();
  const createOffice = useCreateOffice();

  async function handleCreateTransferLocation(type: 'ciudad' | 'seccion' | 'oficina') {
    const nombre = newLocNombre.trim();
    if (!nombre || !action) return;
    try {
      if (type === 'ciudad') {
        const city = await createCity.mutateAsync(nombre);
        setAction((p) => p ? { ...p, ciudadId: String(city.id), seccionId: '', oficinaId: '' } : p);
      } else if (type === 'seccion') {
        const sec = await createSection.mutateAsync({ nombre, ciudadId: Number(action.ciudadId) });
        setAction((p) => p ? { ...p, seccionId: String(sec.id), oficinaId: '' } : p);
      } else {
        const off = await createOffice.mutateAsync({ nombre, seccionId: Number(action.seccionId) });
        setAction((p) => p ? { ...p, oficinaId: String(off.id) } : p);
      }
      setCreatingLoc(null);
      setNewLocNombre('');
    } catch { /* silencioso */ }
  }

  const isPending = transferMutation.isPending || supportMutation.isPending || serviceMutation.isPending || returnServiceMutation.isPending;

  function openAction(type: ActionType) {
    setAction({ ...INITIAL_ACTION, type });
    setActionError('');
  }

  function closeAction() { setAction(null); setActionError(''); }

  function handleActionChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setAction((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [name]: value };
      if (name === 'ciudadId') { next.seccionId = ''; next.oficinaId = ''; }
      if (name === 'seccionId') { next.oficinaId = ''; }
      return next;
    });
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

  // ── Cascada de ubicación para transferencia ──────────────────────────────
  const ciudadSel = locations?.find((c) => c.id === Number(action?.ciudadId));
  const seccionSel = ciudadSel?.secciones.find((s) => s.id === Number(action?.seccionId));

  // ── Acciones disponibles para el estado actual ───────────────────────────
  const estadoReal = equipo ? resolveEstado(equipo.estado, equipo.oficina.nombre) : 'ACTIVO';
  const accionesDisponibles = equipo ? (ACCIONES_POR_ESTADO[estadoReal] ?? []) : [];

  if (isLoading) return <div className={styles.loading}>Cargando equipo...</div>;
  if (!equipo) return (
    <div className={styles.notFound}>
      <h2>Equipo no encontrado</h2>
      <button onClick={() => navigate('/equipos')} className={styles.backBtn}>← Volver al listado</button>
    </div>
  );

  const cfg = action ? MODAL_CONFIG[action.type] : null;

  return (
    <div className={styles.page}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/equipos')}>
          <ChevronLeft size={16} />
          Volver
        </button>
        <div className={styles.headerInfo}>
          <h2 className={styles.title}>
            <span className={styles.titleSerie}>Serie {equipo.serie}</span>
            <span className={styles.titleMeta}>
              {equipo.tipoEquipo.nombre}{equipo.modelo ? ` — ${equipo.modelo}` : ''}
            </span>
          </h2>
          <span className={styles.badge} data-color={STATUS_COLOR[estadoReal] || 'neutral'}>
            {STATUS_LABEL[estadoReal] || estadoReal}
          </span>
        </div>
        <button className={styles.editBtn} onClick={() => navigate(`/equipos/${id}/editar`)}>
          <Pencil size={14} />
          Editar
        </button>
      </div>

      <div className={styles.content}>
        {/* ── Columna izquierda ────────────────────────────────────────── */}
        <div className={styles.leftCol}>
          {/* Ficha */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Información del Equipo</h3>
            <dl className={styles.details}>
              <div className={styles.detailRow}><dt>Tipo</dt><dd>{equipo.tipoEquipo.nombre}</dd></div>
              {equipo.template && <div className={styles.detailRow}><dt>Modelo</dt><dd>{equipo.template.nombre}</dd></div>}
              <div className={styles.detailRow}>
                <dt>Ubicación</dt>
                <dd>{equipo.oficina.seccion.ciudad.nombre} › {equipo.oficina.seccion.nombre} › {equipo.oficina.nombre}</dd>
              </div>
              {equipo.ip && <div className={styles.detailRow}><dt>IP</dt><dd className={styles.mono}>{equipo.ip}</dd></div>}
              {equipo.observacion && <div className={styles.detailRow}><dt>Observación</dt><dd>{equipo.observacion}</dd></div>}
              <div className={styles.detailRow}><dt>Registrado</dt><dd>{new Date(equipo.createdAt).toLocaleDateString('es-UY')}</dd></div>
            </dl>
          </div>

          {/* Acciones */}
          {accionesDisponibles.length > 0 && (
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Acciones</h3>
              <div className={styles.actionButtons}>
                {accionesDisponibles.map((a) => {
                  const Icon = ACCION_ICON[a.type];
                  return (
                    <button
                      key={a.type}
                      className={styles.actionBtn}
                      data-variant={a.variant}
                      onClick={() => openAction(a.type)}
                    >
                      <Icon size={15} />
                      {a.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
        </div>

        {/* ── Columna derecha: Timeline ────────────────────────────────── */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>
            Historial
            {historial && <span className={styles.count}>{historial.length} registros</span>}
          </h3>
          {loadingHistory ? (
            <p className={styles.loadingText}>Cargando historial...</p>
          ) : historial && historial.length > 0 ? (
            <div className={styles.timeline}>
              {historial.map((entry, index) => (
                <div key={entry.id} className={styles.timelineItem} data-last={index === historial.length - 1}>
                  <div className={styles.timelineDot} data-color={ACCION_COLOR[entry.accion] || 'neutral'} />
                  <div className={styles.timelineContent}>
                    <div className={styles.timelineHeader}>
                      <span className={styles.timelineAccion} data-color={ACCION_COLOR[entry.accion] || 'neutral'}>
                        {ACCION_LABEL[entry.accion] || entry.accion}
                      </span>
                      <span className={styles.timelineFecha}>
                        {new Date(entry.fecha).toLocaleDateString('es-UY', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <p className={styles.timelineMotivo}>{entry.motivo}</p>
                    {(entry.oficinaOrigen || entry.oficinaDestino) && (
                      <p className={styles.timelineUbicacion}>
                        {entry.oficinaOrigen && <span>{entry.oficinaOrigen.nombre}</span>}
                        {entry.oficinaOrigen && entry.oficinaDestino && (
                          <ArrowRightLeft size={10} />
                        )}
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
                <div className={styles.locationCascade}>
                  <div className={styles.field}>
                    <div className={styles.labelRow}>
                      <label className={styles.label}>Ciudad *</label>
                      {creatingLoc !== 'ciudad' && <button type="button" className={styles.newLocBtn} onClick={() => { setCreatingLoc('ciudad'); setNewLocNombre(''); }}>+ Nueva</button>}
                    </div>
                    {creatingLoc === 'ciudad' ? (
                      <div className={styles.inlineCreate}>
                        <input autoFocus className={styles.input} value={newLocNombre} onChange={(e) => setNewLocNombre(e.target.value)} placeholder="Nombre de la ciudad" onKeyDown={(e) => e.key === 'Enter' && handleCreateTransferLocation('ciudad')} />
                        <button type="button" className={styles.inlineConfirm} onClick={() => handleCreateTransferLocation('ciudad')} disabled={createCity.isPending}>✓</button>
                        <button type="button" className={styles.inlineCancel} onClick={() => setCreatingLoc(null)}>✕</button>
                      </div>
                    ) : (
                      <select name="ciudadId" value={action.ciudadId} onChange={handleActionChange} className={styles.select}>
                        <option value="">Seleccioná...</option>
                        {locations?.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                    )}
                  </div>
                  <div className={styles.field}>
                    <div className={styles.labelRow}>
                      <label className={styles.label}>Sección *</label>
                      {creatingLoc !== 'seccion' && action.ciudadId && <button type="button" className={styles.newLocBtn} onClick={() => { setCreatingLoc('seccion'); setNewLocNombre(''); }}>+ Nueva</button>}
                    </div>
                    {creatingLoc === 'seccion' ? (
                      <div className={styles.inlineCreate}>
                        <input autoFocus className={styles.input} value={newLocNombre} onChange={(e) => setNewLocNombre(e.target.value)} placeholder="Nombre de la sección" onKeyDown={(e) => e.key === 'Enter' && handleCreateTransferLocation('seccion')} />
                        <button type="button" className={styles.inlineConfirm} onClick={() => handleCreateTransferLocation('seccion')} disabled={createSection.isPending}>✓</button>
                        <button type="button" className={styles.inlineCancel} onClick={() => setCreatingLoc(null)}>✕</button>
                      </div>
                    ) : (
                      <select name="seccionId" value={action.seccionId} onChange={handleActionChange} className={styles.select} disabled={!action.ciudadId}>
                        <option value="">Seleccioná...</option>
                        {ciudadSel?.secciones.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                      </select>
                    )}
                  </div>
                  <div className={styles.field}>
                    <div className={styles.labelRow}>
                      <label className={styles.label}>Oficina destino *</label>
                      {creatingLoc !== 'oficina' && action.seccionId && <button type="button" className={styles.newLocBtn} onClick={() => { setCreatingLoc('oficina'); setNewLocNombre(''); }}>+ Nueva</button>}
                    </div>
                    {creatingLoc === 'oficina' ? (
                      <div className={styles.inlineCreate}>
                        <input autoFocus className={styles.input} value={newLocNombre} onChange={(e) => setNewLocNombre(e.target.value)} placeholder="Nombre de la oficina" onKeyDown={(e) => e.key === 'Enter' && handleCreateTransferLocation('oficina')} />
                        <button type="button" className={styles.inlineConfirm} onClick={() => handleCreateTransferLocation('oficina')} disabled={createOffice.isPending}>✓</button>
                        <button type="button" className={styles.inlineCancel} onClick={() => setCreatingLoc(null)}>✕</button>
                      </div>
                    ) : (
                      <select name="oficinaId" value={action.oficinaId} onChange={handleActionChange} className={styles.select} disabled={!action.seccionId}>
                        <option value="">Seleccioná...</option>
                        {seccionSel?.oficinas.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                      </select>
                    )}
                  </div>
                </div>
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
    </div>
  );
}
