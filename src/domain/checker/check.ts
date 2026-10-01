import type { CheckResult } from '../types';
import { analyse } from './analyse';
import { decide } from './decide';
import type { ReportCounts } from './decide';

export const ENGINE_VERSION = 'trustshield-rules-2026.10.1';

/**
 * Checks anything that contacted the customer: a number, link, email,
 * place or whole message. Pure and synchronous — the same function backs
 * POST /api/check and the in-browser offline fallback.
 */
export function check(input: string, reportCounts: ReportCounts = {}): CheckResult {
  return decide(analyse(input), reportCounts);
}

export { analyse, decide };
