import type { Analysis, CheckResult, OfficialRecordSummary, ReasonCode, Signal, Verdict } from '../types';
import { RULE_SEVERITY, SEVERITY_RANK } from '../rules/catalogue';
import { findOfficialRecord } from '../../data/officialRegistry';
import { REPORT_THRESHOLD } from '../reports/policy';

/** Warning signs that describe a situation rather than a lie; never decisive alone. */
const CONTEXT_ONLY: ReadonlySet<ReasonCode> = new Set(['FAKE_JOB_CONTEXT']);

export type ReportCounts = Readonly<Record<string, number>>;

function summarise(id: string): OfficialRecordSummary | null {
  const record = findOfficialRecord(id);
  if (!record) return null;
  if ('address' in record) {
    return { id, type: 'LOCATION', value: `${record.name}, ${record.address}`, label: record.name, source: record.source };
  }
  return { id, type: record.type, value: record.display, label: record.labelKey, source: record.source };
}

function dedupe(signals: Signal[]): Signal[] {
  const byCode = new Map<ReasonCode, Signal>();
  for (const s of signals) {
    const existing = byCode.get(s.code);
    if (!existing) byCode.set(s.code, s);
    else if (s.code === 'REPORTED_ENTITY' || s.code === 'COMMUNITY_REPORTS') {
      const a = Number(existing.params?.count ?? 0);
      const b = Number(s.params?.count ?? 0);
      if (b > a) byCode.set(s.code, s);
    }
  }
  return Array.from(byCode.values());
}

/**
 * THE VERDICT POLICY — deliberately simple, explainable and conservative.
 *
 *   hard contradiction (high / critical)            → NOT_OFFICIAL
 *   two or more different warning signs (medium)     → NOT_OFFICIAL
 *   one warning sign + "this is Mukuru" claim         → NOT_OFFICIAL
 *     (unless every contact in it is official)
 *   one warning sign                                 → CANT_CONFIRM
 *   every contact matches the official registry      → OFFICIAL
 *   anything else (absence of evidence)              → CANT_CONFIRM
 *
 * Community reports only count against contacts that are NOT official,
 * and only once they reach REPORT_THRESHOLD independent reports.
 */
export function decide(analysis: Analysis, reportCounts: ReportCounts = {}): CheckResult {
  const signals: Signal[] = [...analysis.signals];
  const reportableKeys: string[] = [];
  let reportCount = 0;

  for (const entity of analysis.entities) {
    if (entity.status === 'OFFICIAL') continue;
    reportableKeys.push(entity.canonicalKey);
    const count = reportCounts[entity.canonicalKey] ?? 0;
    reportCount = Math.max(reportCount, count);
    if (count >= REPORT_THRESHOLD) {
      signals.push({ code: 'REPORTED_ENTITY', severity: RULE_SEVERITY.REPORTED_ENTITY, params: { count, value: entity.display } });
    } else if (count > 0) {
      signals.push({ code: 'COMMUNITY_REPORTS', severity: RULE_SEVERITY.COMMUNITY_REPORTS, params: { count } });
    }
  }
  if (analysis.messageKey) {
    reportableKeys.push(analysis.messageKey);
    const count = reportCounts[analysis.messageKey] ?? 0;
    reportCount = Math.max(reportCount, count);
    if (count >= REPORT_THRESHOLD) {
      signals.push({ code: 'REPORTED_ENTITY', severity: RULE_SEVERITY.REPORTED_ENTITY, params: { count, value: '' } });
    } else if (count > 0) {
      signals.push({ code: 'COMMUNITY_REPORTS', severity: RULE_SEVERITY.COMMUNITY_REPORTS, params: { count } });
    }
  }

  const allOfficial = analysis.entities.length > 0 && analysis.entities.every((e) => e.status === 'OFFICIAL');
  const unique = dedupe(signals);
  const hard = unique.some((s) => s.severity === 'high' || s.severity === 'critical');
  const mediums = unique.filter((s) => s.severity === 'medium');
  const decisiveMediums = mediums.filter((s) => !CONTEXT_ONLY.has(s.code));

  let verdict: Verdict;
  if (hard) verdict = 'NOT_OFFICIAL';
  else if (mediums.length >= 2) verdict = 'NOT_OFFICIAL';
  else if (decisiveMediums.length === 1 && analysis.mukuruClaim && !allOfficial) verdict = 'NOT_OFFICIAL';
  else if (mediums.length >= 1) verdict = 'CANT_CONFIRM';
  else if (allOfficial) verdict = 'OFFICIAL';
  else verdict = 'CANT_CONFIRM';

  if (analysis.entities.length === 0 && unique.length === 0) {
    unique.push({ code: 'NO_CHECKABLE_DETAILS', severity: RULE_SEVERITY.NO_CHECKABLE_DETAILS });
  }

  // Most important first; on an OFFICIAL verdict the positive match leads.
  unique.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);

  const firstOfficial = analysis.entities.find((e) => e.status === 'OFFICIAL' && e.officialRecordId);
  return {
    verdict,
    inputType: analysis.inputType,
    reasonCodes: unique.map((s) => s.code),
    signals: unique,
    entities: analysis.entities,
    matchedOfficialRecord: firstOfficial?.officialRecordId ? summarise(firstOfficial.officialRecordId) : null,
    reportCount,
    // Official records can never be reported as scams.
    reportableKeys: verdict === 'OFFICIAL' ? [] : reportableKeys,
    truncated: analysis.truncated,
  };
}
