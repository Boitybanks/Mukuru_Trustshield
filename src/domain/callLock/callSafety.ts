/**
 * TRUSTSHIELD CALLLOCK — call-state providers.
 *
 * Privacy contract (enforced by tests and by the Permissions-Policy header):
 * a CallSafetyProvider exposes ONE fact — whether a call is in progress.
 * It never records, streams, transcribes or analyses audio, and never
 * learns who is calling or what is said.
 */

export const CALL_STATES = ['ACTIVE', 'INACTIVE', 'UNKNOWN'] as const;
export type CallState = (typeof CALL_STATES)[number];

export type CallSafetyProviderKind = 'SIMULATED' | 'BROWSER_UNSUPPORTED' | 'NATIVE_DEVICE';

export interface CallSafetyProvider {
  readonly kind: CallSafetyProviderKind;
  getCallState(): Promise<CallState>;
  /** Optional push updates; returns an unsubscribe function. */
  subscribe?(listener: (state: CallState) => void): () => void;
}

/**
 * Hackathon demo provider. The demo controls ("Simulate scam call" /
 * "Simulate call ended") set the state by hand.
 */
export class SimulatedCallSafetyProvider implements CallSafetyProvider {
  readonly kind = 'SIMULATED' as const;
  private state: CallState;
  private readonly listeners = new Set<(state: CallState) => void>();

  constructor(initial: CallState = 'INACTIVE') {
    this.state = initial;
  }

  async getCallState(): Promise<CallState> {
    return this.state;
  }

  setCallState(next: CallState): void {
    if (next === this.state) return;
    this.state = next;
    for (const listener of this.listeners) listener(next);
  }

  subscribe(listener: (state: CallState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

/**
 * The honest answer for a web page: browsers cannot read the phone's
 * cellular call state, so this always reports UNKNOWN and TrustShield
 * never claims call protection it cannot deliver.
 *
 * Future native adapters (state only, no audio):
 *  - Android: TelephonyCallback.CallStateListener (CALL_STATE_OFFHOOK / IDLE)
 *  - iOS: CallKit CXCallObserver (call.hasEnded / hasConnected)
 */
export class BrowserCallSafetyProvider implements CallSafetyProvider {
  readonly kind = 'BROWSER_UNSUPPORTED' as const;
  async getCallState(): Promise<CallState> {
    return 'UNKNOWN';
  }
}
