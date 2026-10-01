import type { Config, Context } from '@netlify/functions';
import { createReportHandler } from '../../server/handlers';
import { productionDeps } from '../../server/deps';

/** POST /api/report — community warnings. GET /api/reports/:key — current count. */
export default async (req: Request, context: Context) =>
  createReportHandler(productionDeps())(req, { ip: context.ip, params: context.params });

export const config: Config = { path: ['/api/report', '/api/reports/:key'] };
