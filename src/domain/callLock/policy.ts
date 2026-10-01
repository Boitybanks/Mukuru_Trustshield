import type { CallState } from './callSafety';

/** Actions a scammer on the line typically talks a victim through. */
export const SENSITIVE_ACTIONS = ['SEND_MONEY', 'ADD_RECIPIENT', 'CONFIRM_TRANSFER', 'SHARE_CREDENTIALS'] as const;
export type SensitiveAction = (typeof SENSITIVE_ACTIONS)[number];
export type CustomerAction = SensitiveAction | 'VIEW_BALANCE' | 'CHECK_CONTACT';

export type CallProtection = 'ON' | 'UNAVAILABLE';

export type CallLockDecision =
  | { decision: 'PAUSE'; reasonCode: 'CALL_IN_PROGRESS'; protection: 'ON' }
  | { decision: 'PROCEED'; reasonCode: null; protection: CallProtection };

export function isSensitive(action: CustomerAction): action is SensitiveAction {
  return (SENSITIVE_ACTIONS as readonly string[]).includes(action);
}

/**
 * CORE POLICY:  ACTIVE CALL + SENSITIVE FINANCIAL ACTION = PAUSE TRANSACTION
 *
 * - ACTIVE   → pause. There is deliberately no "continue anyway".
 * - INACTIVE → proceed to the normal TrustShield checks (protection ON).
 * - UNKNOWN  → proceed, but report protection UNAVAILABLE so the UI never
 *              claims a call check it could not perform.
 */
export function evaluateCallLock(callState: CallState, action: CustomerAction): CallLockDecision {
  if (callState === 'ACTIVE' && isSensitive(action)) {
    return { decision: 'PAUSE', reasonCode: 'CALL_IN_PROGRESS', protection: 'ON' };
  }
  return { decision: 'PROCEED', reasonCode: null, protection: callState === 'UNKNOWN' ? 'UNAVAILABLE' : 'ON' };
}
