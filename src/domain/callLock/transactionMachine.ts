import type { CallState } from './callSafety';
import { evaluateCallLock } from './policy';
import type { TransactionDraft, TransactionRisk } from '../transaction/evaluateTransaction';

/**
 * The payment flow as a pure state machine. Its key invariants:
 *
 *  1. SENT is reachable ONLY from REVIEW via an explicit CONFIRM event.
 *  2. A call ending NEVER sends money: PAUSED_ON_CALL → CHECKING → REVIEW/BLOCKED.
 *  3. The call gate runs on SUBMIT *and* on CONFIRM, so a call that starts
 *     while the customer is reviewing pauses the payment again.
 *  4. A STOP risk result can never be confirmed (BLOCKED has no way to SENT).
 *  5. CAUTION requires the customer to acknowledge the warning first.
 */
export type TxState =
  | { status: 'EDITING' }
  | { status: 'PAUSED_ON_CALL'; draft: TransactionDraft }
  | { status: 'CHECKING'; draft: TransactionDraft }
  | { status: 'REVIEW'; draft: TransactionDraft; result: TransactionRisk }
  | { status: 'BLOCKED'; draft: TransactionDraft; result: TransactionRisk }
  | { status: 'SENT'; draft: TransactionDraft; result: TransactionRisk; sentAt: string }
  | { status: 'CANCELLED'; draft: TransactionDraft | null };

export type TxEvent =
  | { type: 'SUBMIT'; draft: TransactionDraft; callState: CallState }
  | { type: 'CALL_STATE_CHANGED'; callState: CallState }
  | { type: 'CHECK_COMPLETED'; result: TransactionRisk }
  | { type: 'CONFIRM'; callState: CallState; acknowledgedWarning: boolean; at: string }
  | { type: 'CANCEL' }
  | { type: 'RESET' };

export const INITIAL_TX_STATE: TxState = { status: 'EDITING' };

function draftOf(state: TxState): TransactionDraft | null {
  return 'draft' in state ? state.draft : null;
}

export function transactionReducer(state: TxState, event: TxEvent): TxState {
  switch (event.type) {
    case 'RESET':
      return INITIAL_TX_STATE;

    case 'CANCEL':
      if (state.status === 'SENT') return state;
      return { status: 'CANCELLED', draft: draftOf(state) };

    case 'SUBMIT': {
      if (state.status !== 'EDITING') return state;
      const gate = evaluateCallLock(event.callState, 'SEND_MONEY');
      return gate.decision === 'PAUSE'
        ? { status: 'PAUSED_ON_CALL', draft: event.draft }
        : { status: 'CHECKING', draft: event.draft };
    }

    case 'CALL_STATE_CHANGED': {
      if (event.callState === 'ACTIVE') {
        // A new call pauses anything not yet sent.
        if (state.status === 'CHECKING' || state.status === 'REVIEW') {
          return { status: 'PAUSED_ON_CALL', draft: state.draft };
        }
        return state;
      }
      // Only an explicit INACTIVE releases the pause — and only into a fresh check.
      if (state.status === 'PAUSED_ON_CALL' && event.callState === 'INACTIVE') {
        return { status: 'CHECKING', draft: state.draft };
      }
      return state;
    }

    case 'CHECK_COMPLETED':
      if (state.status !== 'CHECKING') return state;
      return event.result.risk === 'STOP'
        ? { status: 'BLOCKED', draft: state.draft, result: event.result }
        : { status: 'REVIEW', draft: state.draft, result: event.result };

    case 'CONFIRM': {
      if (state.status !== 'REVIEW') return state;
      if (evaluateCallLock(event.callState, 'CONFIRM_TRANSFER').decision === 'PAUSE') {
        return { status: 'PAUSED_ON_CALL', draft: state.draft };
      }
      if (state.result.requiresConfirmation === false) return state;
      if (state.result.risk === 'CAUTION' && !event.acknowledgedWarning) return state;
      return { status: 'SENT', draft: state.draft, result: state.result, sentAt: event.at };
    }
  }
}

export function moneyHasMoved(state: TxState): boolean {
  return state.status === 'SENT';
}
