import { describe, expect, it } from 'vitest';
import { createCheckHandler, createProofHandler, createReportHandler, createTransactionHandler, healthHandler } from '../../server/handlers';
import { CALLLOCK_SCENARIO } from '../../src/data/demoScenarios';
import { get, post, testDeps } from './helpers';

const CHECK_FIELDS = [
  'verdict',
  'inputType',
  'reasonCodes',
  'title',
  'reason',
  'nextStep',
  'nextSteps',
  'reasons',
  'signals',
  'entities',
  'matchedOfficialRecord',
  'reportCount',
  'reportableKeys',
  'truncated',
  'language',
  'engineVersion',
  'checkedAt',
];

describe('POST /api/check', () => {
  const { deps } = testDeps();
  const check = createCheckHandler(deps);

  it('OFFICIAL: returns every schema field', async () => {
    const res = await check(post('/api/check', { input: '+27 86 0018 555', language: 'en' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const body = await res.json();
    expect(Object.keys(body).sort()).toEqual([...CHECK_FIELDS].sort());
    expect(body).toMatchObject({
      verdict: 'OFFICIAL',
      inputType: 'PHONE',
      reasonCodes: ['OFFICIAL_PHONE_MATCH'],
      reason: 'This number matches Mukuru’s official South African contact.',
      matchedOfficialRecord: { id: 'za-call-centre', type: 'PHONE', value: '0860 018 555' },
      reportCount: 0,
      language: 'en',
    });
    expect(new Date(body.checkedAt).toISOString()).toBe(body.checkedAt);
  });

  it('NOT_OFFICIAL: look-alike URL, explained in Shona', async () => {
    const res = await check(post('/api/check', { input: 'https://mukuru-secure-pay.co.za/verify', language: 'sn' }));
    const body = await res.json();
    expect(body.verdict).toBe('NOT_OFFICIAL');
    expect(body.reasonCodes).toContain('LOOKALIKE_DOMAIN');
    expect(body.title).toBe('Haisi Mukuru yepamutemo — mira');
    expect(body.reason).toBe('mukuru-secure-pay.co.za inoita seMukuru, asi haisi mukuru.com.');
  });

  it("CANT_CONFIRM: unknown location, explained in Portuguese", async () => {
    const res = await check(post('/api/check', { input: 'Mukuru collection point, 19 Random Road, Johannesburg', language: 'pt' }));
    const body = await res.json();
    expect(body).toMatchObject({ verdict: 'CANT_CONFIRM', inputType: 'LOCATION', title: 'Não foi possível confirmar' });
  });

  it('defaults to English when no language is given', async () => {
    const body = await (await check(post('/api/check', { input: 'mukuru.com' }))).json();
    expect(body.language).toBe('en');
  });

  it('rejects empty input with a structured error', async () => {
    const res = await check(post('/api/check', { input: '   ' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('INVALID_REQUEST');
  });

  it('rejects input over 5,000 characters with 413 INPUT_TOO_LONG', async () => {
    const res = await check(post('/api/check', { input: 'a'.repeat(5001) }));
    expect(res.status).toBe(413);
    expect((await res.json()).error.code).toBe('INPUT_TOO_LONG');
  });

  it('rejects a 100,000-character body before parsing it', async () => {
    const res = await check(post('/api/check', JSON.stringify({ input: 'x'.repeat(100_000) })));
    expect(res.status).toBe(413);
    expect((await res.json()).error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('rejects non-JSON and unknown languages', async () => {
    expect((await check(post('/api/check', 'not json'))).status).toBe(400);
    expect((await check(post('/api/check', { input: 'x' }, { 'content-type': 'text/plain' }))).status).toBe(415);
    expect((await check(post('/api/check', { input: 'x', language: 'fr' }))).status).toBe(400);
  });

  it('only accepts POST', async () => {
    const res = await check(get('/api/check'));
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('POST');
  });

  it('still answers when community data is unavailable', async () => {
    const broken = testDeps();
    broken.deps.reports.getCounts = async () => {
      throw new Error('blobs down');
    };
    const res = await createCheckHandler(broken.deps)(post('/api/check', { input: 'https://mukuru-pay.example' }));
    expect(res.status).toBe(200);
    expect((await res.json()).verdict).toBe('NOT_OFFICIAL');
  });

  it('rate-limits abusive clients', async () => {
    const { deps: d } = testDeps();
    const h = createCheckHandler(d);
    let last = 200;
    for (let i = 0; i < 61; i++) last = (await h(post('/api/check', { input: 'mukuru.com' }), { ip: '203.0.113.9' })).status;
    expect(last).toBe(429);
  });
});

describe('POST /api/report + GET /api/reports/:key (persistence)', () => {
  it('persists a report, increments per reporter, and the count shows up on the next check', async () => {
    const { deps } = testDeps();
    const report = createReportHandler(deps);
    const check = createCheckHandler(deps);
    const input = 'https://www.example.org/win';

    const first = await report(post('/api/report', { input, reporterId: 'browser-aaaa1111' }));
    expect(first.status).toBe(201);
    expect(await first.json()).toMatchObject({ reportCount: 1, alreadyReported: false });

    const again = await (await report(post('/api/report', { input, reporterId: 'browser-aaaa1111' }))).json();
    expect(again).toMatchObject({ reportCount: 1, alreadyReported: true });

    await report(post('/api/report', { input, reporterId: 'browser-bbbb2222' }));
    const afterTwo = await (await check(post('/api/check', { input }))).json();
    expect(afterTwo).toMatchObject({ verdict: 'CANT_CONFIRM', reportCount: 2 });
    expect(afterTwo.reasonCodes).toContain('COMMUNITY_REPORTS');

    await report(post('/api/report', { input, reporterId: 'browser-cccc3333' }));
    const afterThree = await (await check(post('/api/check', { input }))).json();
    expect(afterThree).toMatchObject({ verdict: 'NOT_OFFICIAL', reportCount: 3 });
    expect(afterThree.reasonCodes).toContain('REPORTED_ENTITY');

    const lookup = await (await report(get('/api/reports/host%3Awww.example.org'), { params: { key: 'host%3Awww.example.org' } })).json();
    expect(lookup).toMatchObject({ found: true, reportCount: 3, canonicalValue: 'www.example.org' });
  });

  it('refuses to report an official Mukuru contact (409)', async () => {
    const { deps } = testDeps();
    const res = await createReportHandler(deps)(post('/api/report', { input: '0860 018 555', reporterId: 'browser-aaaa1111' }));
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe('OFFICIAL_ENTITY');
  });

  it('stores only the canonical value — never the pasted message', async () => {
    const { deps, reports } = testDeps();
    await createReportHandler(deps)(
      post('/api/report', { input: 'Send your OTP 123456 to https://mukuru-pay.example now', reporterId: 'browser-aaaa1111' }),
    );
    const stored = JSON.stringify([...reports.records.values()]);
    expect(stored).toContain('mukuru-pay.example');
    expect(stored).not.toContain('123456');
    expect(stored).not.toContain('Send your OTP');
  });

  it('reports a contact-free scam message by fingerprint only', async () => {
    const { deps, reports } = testDeps();
    const res = await createReportHandler(deps)(post('/api/report', { input: 'Pay R500 release fee to get your prize', reporterId: 'browser-aaaa1111' }));
    expect(res.status).toBe(201);
    const [record] = [...reports.records.values()];
    expect(record!.canonicalKey).toMatch(/^msg:[0-9a-f]{16}$/);
    expect(record!.canonicalValue).toBe('message');
  });

  it('rejects malformed keys and unknown methods', async () => {
    const { deps } = testDeps();
    const h = createReportHandler(deps);
    expect((await h(get('/api/reports/%3Cscript%3E'), { params: { key: '%3Cscript%3E' } })).status).toBe(400);
    expect((await h(new Request('https://t.test/api/report', { method: 'DELETE' }))).status).toBe(405);
  });
});

describe('MukuruProof API', () => {
  it('creates a proof, verifies it, then reports EXPIRED without leaking claims', async () => {
    const { deps, advance, proofs } = testDeps();
    const h = createProofHandler(deps);
    const created = await h(post('/api/proof/create', {}));
    expect(created.status).toBe(201);
    const proof = await created.json();
    expect(proof).toMatchObject({ simulated: true, verifyPath: `/verify/${proof.proofId}`, holder: { displayName: 'Blessing Ndlovu' } });
    expect(Date.parse(proof.expiresAt) - Date.parse(proof.createdAt)).toBe(600_000);

    // The raw proof ID is never stored — only its SHA-256.
    expect([...proofs.records.keys()]).not.toContain(proof.proofId);

    const valid = await h(get(`/api/proof/${proof.proofId}`), { params: { id: proof.proofId } });
    expect(valid.status).toBe(200);
    const body = await valid.json();
    expect(body).toMatchObject({
      status: 'VALID',
      claims: { identity: 'VERIFIED', accountOwnership: 'VERIFIED', accountStatus: 'ACTIVE', canReceiveCredits: true },
    });
    expect(JSON.stringify(body)).not.toMatch(/balance|transactions|statement|idNumber/i);

    advance(601);
    const expired = await h(get(`/api/proof/${proof.proofId}`), { params: { id: proof.proofId } });
    expect(expired.status).toBe(410);
    const expiredBody = await expired.json();
    expect(expiredBody.status).toBe('EXPIRED');
    expect(expiredBody.claims).toBeUndefined();
  });

  it('supports a short demo lifetime', async () => {
    const { deps } = testDeps();
    const proof = await (await createProofHandler(deps)(post('/api/proof/create', { ttlSeconds: 15 }))).json();
    expect(proof.ttlSeconds).toBe(15);
  });

  it('forged or malformed proof IDs fail safely', async () => {
    const { deps } = testDeps();
    const h = createProofHandler(deps);
    const forged = 'Z'.repeat(43);
    expect((await h(get(`/api/proof/${forged}`), { params: { id: forged } })).status).toBe(404);
    expect((await h(get('/api/proof/../../etc'), { params: { id: '..' } })).status).toBe(400);
  });
});

describe('POST /api/transaction/check (CallLock)', () => {
  const { deps } = testDeps();
  const h = createTransactionHandler(deps);

  it('ACTIVE call → PAUSED, never evaluated, never sent', async () => {
    const body = await (await h(post('/api/transaction/check', { draft: CALLLOCK_SCENARIO, callState: 'ACTIVE' }))).json();
    expect(body).toMatchObject({ decision: 'PAUSED', reasonCode: 'CALL_IN_PROGRESS', moneyMoved: false });
  });

  it('INACTIVE → the seeded scenario is BLOCKED with the three expected reasons', async () => {
    const body = await (await h(post('/api/transaction/check', { draft: CALLLOCK_SCENARIO, callState: 'INACTIVE', language: 'pt' }))).json();
    expect(body).toMatchObject({ decision: 'BLOCKED', verdict: 'NOT_OFFICIAL', moneyMoved: false, requiresConfirmation: false });
    expect(body.reasonCodes.sort()).toEqual(['FAKE_JOB_CONTEXT', 'NEW_RECIPIENT', 'UPFRONT_FEE']);
    expect(body.reasons[0].text).toBeTypeOf('string');
  });

  it('UNKNOWN → proceeds, but reports call protection as UNAVAILABLE', async () => {
    const body = await (await h(post('/api/transaction/check', { draft: { ...CALLLOCK_SCENARIO, purpose: 'BILLS', recipientName: 'City power', reference: 'June', recipientIsNew: false }, callState: 'UNKNOWN' }))).json();
    expect(body).toMatchObject({ decision: 'REVIEW', callLock: { protection: 'UNAVAILABLE' }, requiresConfirmation: true, moneyMoved: false });
  });
});

describe('GET /api/health', () => {
  it('reports the engine version', async () => {
    const body = await (await healthHandler()()).json();
    expect(body).toMatchObject({ status: 'ok' });
  });
});
