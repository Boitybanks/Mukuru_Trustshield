import type { Config, Context } from '@netlify/functions';
import { createCheckHandler } from '../../server/handlers';
import { productionDeps } from '../../server/deps';

/** POST /api/check — the standalone "Is this really Mukuru?" checker API. */
export default async (req: Request, context: Context) => createCheckHandler(productionDeps())(req, { ip: context.ip });

export const config: Config = { path: '/api/check' };
