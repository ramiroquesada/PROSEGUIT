import type { EquipmentStatus } from '../constants/equipment-status.js';

export interface Equipment {
  id: number;
  serie: string;
  modelo: string | null;
  templateId: number | null;
  tipoEquipoId: number;
  oficinaId: number;
  estado: EquipmentStatus;
  ip: string | null;
  urlImage: string | null;
  observacion: string | null;
  especificaciones: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  tipoEquipo?: EquipmentType;
  oficina?: Office;
  template?: ModelTemplate | null;
}

export interface EquipmentType {
  id: number;
  nombre: string;
  icono: string | null;
}

export interface ModelTemplate {
  id: number;
  nombre: string;
  tipoEquipoId: number;
  marca: string | null;
  especificaciones: Record<string, unknown> | null;
}

export interface Office {
  id: number;
  nombre: string;
  seccionId: number;
  seccion?: Section;
}

export interface Section {
  id: number;
  nombre: string;
  ciudadId: number;
  ciudad?: City;
}

export interface City {
  id: number;
  nombre: string;
}

export interface LocationTree {
  id: number;
  nombre: string;
  secciones: (Section & {
    oficinas: Office[];
  })[];
}
