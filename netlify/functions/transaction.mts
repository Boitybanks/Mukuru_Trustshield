import type { Config, Context } from '@netlify/functions';
import { createTransactionHandler } from '../../server/handlers';
import { productionDeps } from '../../server/deps';

/** POST /api/transaction/check — CallLock gate + TrustShield re-check. It can never send money. */
export default async (req: Request, context: Context) =>
  createTransactionHandler(productionDeps())(req, { ip: context.ip });

export const config: Config = { path: '/api/transaction/check' };
