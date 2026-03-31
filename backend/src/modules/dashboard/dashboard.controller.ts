import type { Request, Response } from 'express';
import * as dashboardService from './dashboard.service.js';

export async function statsHandler(_req: Request, res: Response) {
  const stats = await dashboardService.getStats();
  res.json(stats);
}

export async function recentActivityHandler(req: Request, res: Response) {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const accion = typeof req.query.accion === 'string' ? req.query.accion : undefined;
  const activity = await dashboardService.getRecentActivity(limit, accion);
  res.json(activity);
}

export async function loansAlertsHandler(req: Request, res: Response) {
  const limit = Math.min(Number(req.query.limit) || 5, 20);
  const data = await dashboardService.getLoansAlerts(limit);
  res.json(data);
}

export async function repairAlertsHandler(req: Request, res: Response) {
  const limit = Math.min(Number(req.query.limit) || 5, 20);
  const data = await dashboardService.getRepairAlerts(limit);
  res.json(data);
}

export async function equipmentByTypeHandler(_req: Request, res: Response) {
  const data = await dashboardService.getEquipmentByType();
  res.json(data);
}
