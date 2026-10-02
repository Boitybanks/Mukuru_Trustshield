import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BrowserCallSafetyProvider,
  CALL_STATES,
  SimulatedCallSafetyProvider,
} from '../../src/domain/callLock/callSafety';
import type { CallState } from '../../src/domain/callLock/callSafety';
import { evaluateCallLock, SENSITIVE_ACTIONS } from '../../src/domain/callLock/policy';
import { INITIAL_TX_STATE, moneyHasMoved, transactionReducer } from '../../src/domain/callLock/transactionMachine';
import type { TxEvent, TxState } from '../../src/domain/callLock/transactionMachine';
import { evaluateTransaction } from '../../src/domain/transaction/evaluateTransaction';
import type { TransactionDraft } from '../../src/domain/transaction/evaluateTransaction';
import { CALLLOCK_SCENARIO } from '../../src/data/demoScenarios';
import { en } from '../../src/i18n/locales/en';
import { pt } from '../../src/i18n/locales/pt';
import { sn } from '../../src/i18n/locales/sn';

const draft: TransactionDraft = { ...CALLLOCK_SCENARIO };
/** An ordinary payment to someone the customer already pays. */
const familyDraft: TransactionDraft = { recipientName: 'Mum', recipientIsNew: false, amount: 500, currency: 'ZAR', purpose: 'FAMILY_SUPPORT', reference: 'Groceries' };
const at = '2026-10-01T10:00:00.000Z';

function run(events: TxEvent[], start: TxState = INITIAL_TX_STATE): TxState {
  return events.reduce(transactionReducer, start);
}

describe('CallLock policy: ACTIVE CALL + SENSITIVE ACTION = PAUSE', () => {
  it.each(SENSITIVE_ACTIONS)('ACTIVE + %s → paused', (action) => {
    expect(evaluateCallLock('ACTIVE', action)).toEqual({ decision: 'PAUSE', reasonCode: 'CALL_IN_PROGRESS', protection: 'ON' });
  });

  it('INACTIVE → normal TrustShield processing', () => {
    expect(evaluateCallLock('INACTIVE', 'SEND_MONEY')).toEqual({ decision: 'PROCEED', reasonCode: null, protection: 'ON' });
    const state = run([{ type: 'SUBMIT', draft, callState: 'INACTIVE' }]);
    expect(state.status).toBe('CHECKING');
  });

  it('UNKNOWN → proceeds but does NOT claim call protection', () => {
    expect(evaluateCallLock('UNKNOWN', 'SEND_MONEY')).toEqual({ decision: 'PROCEED', reasonCode: null, protection: 'UNAVAILABLE' });
  });

  it('UNKNOWN copy never promises protection, in any language', () => {
    for (const dict of [en, pt, sn]) {
      expect(dict.callLock.unknownNotice).not.toMatch(/protected|protegid|wachengetedzwa/i);
      expect(dict.callLock.provider.BROWSER_UNSUPPORTED).toBeTruthy();
    }
  });

  it('non-sensitive actions are never blocked by a call', () => {
    expect(evaluateCallLock('ACTIVE', 'CHECK_CONTACT').decision).toBe('PROCEED');
  });
});

describe('CallLock transaction machine', () => {
  it('ACTIVE + Send → PAUSED_ON_CALL, and no event except a real call end can release it', () => {
    let state = run([{ type: 'SUBMIT', draft, callState: 'ACTIVE' }]);
    expect(state.status).toBe('PAUSED_ON_CALL');
    // There is no "continue anyway": submitting or confirming again does nothing.
    state = run([{ type: 'SUBMIT', draft, callState: 'INACTIVE' }, { type: 'CONFIRM', callState: 'INACTIVE', acknowledgedWarning: true, at }], state);
    expect(state.status).toBe('PAUSED_ON_CALL');
    // UNKNOWN is not proof the call ended.
    state = run([{ type: 'CALL_STATE_CHANGED', callState: 'UNKNOWN' }], state);
    expect(state.status).toBe('PAUSED_ON_CALL');
  });

  it('ACTIVE → INACTIVE re-runs checks and NEVER auto-sends', () => {
    let state = run([
      { type: 'SUBMIT', draft, callState: 'ACTIVE' },
      { type: 'CALL_STATE_CHANGED', callState: 'INACTIVE' },
    ]);
    expect(state.status).toBe('CHECKING');
    expect(moneyHasMoved(state)).toBe(false);
    state = transactionReducer(state, { type: 'CHECK_COMPLETED', result: evaluateTransaction(familyDraft) });
    expect(state.status).toBe('REVIEW');
    expect(moneyHasMoved(state)).toBe(false);
    state = transactionReducer(state, { type: 'CONFIRM', callState: 'INACTIVE', acknowledgedWarning: false, at });
    expect(state.status).toBe('SENT');
  });

  it('a call that starts during review pauses again, and confirm re-checks the call', () => {
    const review = run([
      { type: 'SUBMIT', draft, callState: 'INACTIVE' },
      { type: 'CHECK_COMPLETED', result: evaluateTransaction({ ...familyDraft, purpose: 'BILLS', reference: '' }) },
    ]);
    expect(review.status).toBe('REVIEW');
    expect(transactionReducer(review, { type: 'CONFIRM', callState: 'ACTIVE', acknowledgedWarning: true, at }).status).toBe('PAUSED_ON_CALL');
    expect(transactionReducer(review, { type: 'CALL_STATE_CHANGED', callState: 'ACTIVE' }).status).toBe('PAUSED_ON_CALL');
  });

  it('a STOP result is BLOCKED and can never be confirmed', () => {
    const blocked = run([
      { type: 'SUBMIT', draft, callState: 'INACTIVE' },
      { type: 'CHECK_COMPLETED', result: evaluateTransaction(draft) },
    ]);
    expect(blocked.status).toBe('BLOCKED');
    expect(transactionReducer(blocked, { type: 'CONFIRM', callState: 'INACTIVE', acknowledgedWarning: true, at }).status).toBe('BLOCKED');
  });

  it('a CAUTION result needs the customer to acknowledge the warning', () => {
    const review = run([
      { type: 'SUBMIT', draft, callState: 'INACTIVE' },
      { type: 'CHECK_COMPLETED', result: evaluateTransaction({ ...familyDraft, recipientName: 'Landlord', purpose: 'OTHER', reference: 'pay R500 deposit' }) },
    ]);
    expect(review.status).toBe('REVIEW');
    expect(transactionReducer(review, { type: 'CONFIRM', callState: 'INACTIVE', acknowledgedWarning: false, at }).status).toBe('REVIEW');
    expect(transactionReducer(review, { type: 'CONFIRM', callState: 'INACTIVE', acknowledgedWarning: true, at }).status).toBe('SENT');
  });

  it('property: across 3,000 random event sequences money only moves via an explicit CONFIRM from REVIEW', () => {
    let seed = 42;
    const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)]!;
    const results = [evaluateTransaction(draft), evaluateTransaction({ ...familyDraft, purpose: 'BILLS', reference: '' })];
    for (let i = 0; i < 3000; i++) {
      let state: TxState = INITIAL_TX_STATE;
      for (let step = 0; step < 12; step++) {
        const callState: CallState = pick(CALL_STATES);
        const event: TxEvent = pick<TxEvent>([
          { type: 'SUBMIT', draft, callState },
          { type: 'CALL_STATE_CHANGED', callState },
          { type: 'CHECK_COMPLETED', result: pick(results) },
          { type: 'CONFIRM', callState, acknowledgedWarning: rand() > 0.5, at },
          { type: 'CANCEL' },
        ]);
        const next = transactionReducer(state, event);
        if (next.status === 'SENT' && state.status !== 'SENT') {
          expect(state.status).toBe('REVIEW');
          expect(event.type).toBe('CONFIRM');
          expect(event.type === 'CONFIRM' && event.callState).not.toBe('ACTIVE');
          expect(next.status === 'SENT' && next.result.risk).not.toBe('STOP');
        }
        // A call ending (or any call-state change) can never be what sends the money.
        if (event.type === 'CALL_STATE_CHANGED' && state.status !== 'SENT') expect(next.status).not.toBe('SENT');
        state = next;
      }
    }
  });
});

describe('Seeded scenario: Blessing’s fake-job call', () => {
  it('after the call ends TrustShield detects NEW_RECIPIENT, UPFRONT_FEE, FAKE_JOB_CONTEXT → NOT OFFICIAL — STOP', () => {
    const result = evaluateTransaction(draft);
    expect(result.reasonCodes.sort()).toEqual(['FAKE_JOB_CONTEXT', 'NEW_RECIPIENT', 'RECIPIENT_PROOF_REQUIRED', 'UPFRONT_FEE']);
    expect(result).toMatchObject({ risk: 'STOP', verdict: 'NOT_OFFICIAL' });
  });

  it('a normal payment to a known person has no warning signs', () => {
    const result = evaluateTransaction({ ...draft, recipientIsNew: false, purpose: 'FAMILY_SUPPORT', reference: 'School fees for Tendai', recipientName: 'Mum' });
    expect(result).toMatchObject({ risk: 'NO_WARNING_SIGNS', verdict: null });
  });
});

describe('CallLock privacy: it never accesses audio or call content', () => {
  it('providers expose only a call state from ACTIVE | INACTIVE | UNKNOWN', async () => {
    const sim = new SimulatedCallSafetyProvider();
    for (const s of CALL_STATES) {
      sim.setCallState(s);
      expect(CALL_STATES).toContain(await sim.getCallState());
    }
    expect(await new BrowserCallSafetyProvider().getCallState()).toBe('UNKNOWN');
    const surface = Object.getOwnPropertyNames(Object.getPrototypeOf(sim)).filter((n) => n !== 'constructor').sort();
    expect(surface).toEqual(['getCallState', 'setCallState', 'subscribe']);
  });

  it('no source file uses microphone, recording or speech APIs', () => {
    const forbidden = /getUserMedia|MediaRecorder|SpeechRecognition|webkitSpeechRecognition|AudioContext|createMediaStreamSource|AudioWorklet/;
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(ts|tsx|mts|js)$/.test(name) && forbidden.test(readFileSync(path, 'utf8'))) offenders.push(path);
      }
    };
    for (const dir of ['src', 'server', 'netlify']) walk(dir);
    expect(offenders).toEqual([]);
  });

  it('the deployed site forbids microphone and camera access via Permissions-Policy', () => {
    const toml = readFileSync('netlify.toml', 'utf8');
    expect(toml).toMatch(/Permissions-Policy = ".*microphone=\(\).*"/);
    expect(toml).toMatch(/Permissions-Policy = ".*camera=\(\).*"/);
  });
});
