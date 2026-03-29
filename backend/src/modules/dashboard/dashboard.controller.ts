import type { Request, Response } from 'express';
import * as dashboardService from './dashboard.service.js';

export async function statsHandler(_req: Request, res: Response) {
  const stats = await dashboardService.getStats();
  res.json(stats);
}

export async function recentActivityHandler(req: Request, res: Response) {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const activity = await dashboardService.getRecentActivity(limit);
  res.json(activity);
}
