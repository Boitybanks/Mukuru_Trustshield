import type { Config } from '@netlify/functions';
import { healthHandler } from '../../server/handlers';

export default healthHandler();

export const config: Config = { path: '/api/health' };
