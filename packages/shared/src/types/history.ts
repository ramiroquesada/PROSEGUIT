import type { ActionType } from '../constants/actions.js';

export interface HistoryEntry {
  id: number;
  equipoId: number;
  accion: ActionType;
  oficinaOrigenId: number | null;
  oficinaDestinoId: number | null;
  usuarioId: number;
  motivo: string;
  comentario: string | null;
  fecha: string;
  metadata: Record<string, unknown> | null;
  usuario?: { nombre: string; ficha: number };
  oficinaOrigen?: { nombre: string } | null;
  oficinaDestino?: { nombre: string } | null;
}

export interface Loan {
  id: number;
  equipoId: number;
  oficinaDestinoId: number;
  solicitanteFicha: number | null;
  tecnicoId: number;
  fechaPrestamo: string;
  fechaDevolucion: string | null;
  motivo: string;
  equipo?: { serie: string; modelo: string | null };
  oficina?: { nombre: string };
  tecnico?: { nombre: string };
}
