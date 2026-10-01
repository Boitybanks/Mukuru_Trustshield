/**
 * Community-report policy.
 *
 * Reports are a SIGNAL, never proof. One anonymous report must not turn
 * something into a definitive scam, so a contact only counts against the
 * verdict once REPORT_THRESHOLD independent reports exist. Below that we
 * show "Reported by N TrustShield users" without changing the verdict.
 *
 * Official Mukuru records can never be reported (the API refuses them), so
 * a malicious user cannot get Mukuru's real number flagged.
 */
export const REPORT_THRESHOLD = 3;

/** Canonical keys look like "phone:+27…", "host:…", "email:…", "ussd:…", "loc:…", "msg:<hash>". */
export const CANONICAL_KEY_PATTERN = /^(phone|host|email|ussd|sms|loc|msg):[^\s]{1,200}$|^loc:[a-z0-9 ]{1,200}$/;

export function isCanonicalKey(value: string): boolean {
  return value.length <= 210 && CANONICAL_KEY_PATTERN.test(value);
}

/** Cap on reporter fingerprints kept per entity (enough to de-duplicate, bounded storage). */
export const MAX_REPORTER_FINGERPRINTS = 500;
