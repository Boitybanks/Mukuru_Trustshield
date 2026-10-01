import type { Config, Context } from '@netlify/functions';
import { createProofHandler } from '../../server/handlers';
import { productionDeps } from '../../server/deps';

/** POST /api/proof/create — issue a MukuruProof. GET /api/proof/:id — verify it. */
export default async (req: Request, context: Context) =>
  createProofHandler(productionDeps())(req, { ip: context.ip, params: context.params });

export const config: Config = { path: ['/api/proof/create', '/api/proof/:id'] };
