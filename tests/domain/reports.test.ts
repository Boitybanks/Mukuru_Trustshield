import { describe, expect, it } from 'vitest';
import { check } from '../../src/domain/checker/check';
import { REPORT_THRESHOLD, isCanonicalKey } from '../../src/domain/reports/policy';
import { InMemoryReportRepository, mergeReport } from '../../server/repositories';
import type { ReportInput } from '../../server/repositories';

const input: ReportInput = {
  canonicalKey: 'host:mukuru-pay.example',
  canonicalValue: 'mukuru-pay.example',
  inputType: 'URL',
  reasonCodes: ['LOOKALIKE_DOMAIN'],
};
const now = new Date('2026-10-01T10:00:00Z');

describe('report count logic', () => {
  it('first report creates a record with count 1', () => {
    const { record, duplicate } = mergeReport(null, input, 'id1', 'fpA', now);
    expect(duplicate).toBe(false);
    expect(record).toMatchObject({ reportCount: 1, canonicalKey: input.canonicalKey, reportedAt: now.toISOString() });
  });

  it('different reporters increment; the same reporter does not', () => {
    const first = mergeReport(null, input, 'id1', 'fpA', now).record;
    const second = mergeReport(first, input, 'id1', 'fpB', now);
    expect(second.record.reportCount).toBe(2);
    const repeat = mergeReport(second.record, input, 'id1', 'fpB', now);
    expect(repeat.duplicate).toBe(true);
    expect(repeat.record.reportCount).toBe(2);
  });

  it('never stores message text — only the canonical value and reason codes', async () => {
    const repo = new InMemoryReportRepository();
    await repo.increment(input, 'fp', now);
    const stored = JSON.stringify(await repo.get(input.canonicalKey));
    expect(stored).not.toMatch(/OTP|send|Pay R/);
    expect(Object.keys((await repo.get(input.canonicalKey))!).sort()).toEqual(
      ['canonicalKey', 'canonicalValue', 'id', 'inputType', 'lastReportedAt', 'reasonCodes', 'reportCount', 'reportedAt', 'reporterFingerprints'].sort(),
    );
  });

  it('validates canonical keys', () => {
    expect(isCanonicalKey('phone:+27712345678')).toBe(true);
    expect(isCanonicalKey('loc:19 johannesburg random road')).toBe(true);
    expect(isCanonicalKey('<script>')).toBe(false);
    expect(isCanonicalKey('host:' + 'a'.repeat(300))).toBe(false);
  });
});

describe('conservative community-report policy', () => {
  const key = 'host:www.example.org';

  it('below the threshold reports are shown but do not change the verdict', () => {
    const r = check('https://www.example.org', { [key]: REPORT_THRESHOLD - 1 });
    expect(r.verdict).toBe('CANT_CONFIRM');
    expect(r.reportCount).toBe(REPORT_THRESHOLD - 1);
    expect(r.reasonCodes).toContain('COMMUNITY_REPORTS');
  });

  it(`at ${REPORT_THRESHOLD} independent reports an unknown contact becomes NOT_OFFICIAL`, () => {
    const r = check('https://www.example.org', { [key]: REPORT_THRESHOLD });
    expect(r.verdict).toBe('NOT_OFFICIAL');
    expect(r.reasonCodes).toContain('REPORTED_ENTITY');
  });

  it('one anonymous report never converts something into a definitive scam', () => {
    expect(check('https://www.example.org', { [key]: 1 }).verdict).toBe('CANT_CONFIRM');
  });

  it('reports can never turn an official Mukuru number into a scam', () => {
    const r = check('0860 018 555', { 'phone:+27860018555': 999 });
    expect(r.verdict).toBe('OFFICIAL');
    expect(r.reportCount).toBe(0);
    expect(r.reportableKeys).toEqual([]);
  });
});
