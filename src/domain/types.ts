/**
 * Core domain types for Mukuru TrustShield.
 *
 * Everything in `src/domain` is framework-free TypeScript: no React, no
 * Netlify, no Node-only APIs. The same code runs in the browser (offline
 * fallback), in Netlify Functions (the public API) and in tests.
 */

export const LANGUAGES = ['en', 'pt', 'sn'] as const;
export type Language = (typeof LANGUAGES)[number];

/** The ONLY three top-level verdicts a customer ever sees. */
export const VERDICTS = ['OFFICIAL', 'NOT_OFFICIAL', 'CANT_CONFIRM'] as const;
export type Verdict = (typeof VERDICTS)[number];

export const INPUT_TYPES = ['PHONE', 'URL', 'EMAIL', 'USSD', 'LOCATION', 'MESSAGE', 'MIXED'] as const;
export type InputType = (typeof INPUT_TYPES)[number];

export type EntityKind = 'PHONE' | 'URL' | 'EMAIL' | 'USSD' | 'SMS_SHORTCODE' | 'LOCATION';

/**
 * Severity drives the verdict policy (see `checker/decide.ts`).
 * - positive: evidence that something IS an official Mukuru record
 * - info:     neutral context (absence of evidence, community signal below threshold)
 * - medium:   a warning sign; two together, or one plus a Mukuru claim, means stop
 * - high:     a hard contradiction of Mukuru's identity
 * - critical: a request Mukuru never makes (PIN, OTP, password, card)
 */
export type Severity = 'positive' | 'info' | 'medium' | 'high' | 'critical';

export type SignalParams = Record<string, string | number>;

export interface Signal {
  code: ReasonCode;
  severity: Severity;
  params?: SignalParams;
}

export type EntityStatus = 'OFFICIAL' | 'UNKNOWN' | 'LOOKALIKE' | 'PARTIAL';

export interface Entity {
  kind: EntityKind;
  /** Exactly what we found in the input (trimmed), for display only. */
  raw: string;
  /** Human-friendly canonical form, e.g. "0860 018 555" or "mukuru-pay.co.za". */
  display: string;
  /** Stable key used for community reports, e.g. "phone:+27860018555". */
  canonicalKey: string;
  status: EntityStatus;
  officialRecordId?: string;
}

export const REASON_CODES = [
  // Positive identity matches
  'OFFICIAL_PHONE_MATCH',
  'OFFICIAL_DOMAIN_MATCH',
  'OFFICIAL_LOCATION_MATCH',
  'OFFICIAL_EMAIL_MATCH',
  'OFFICIAL_USSD_MATCH',
  'OFFICIAL_SMS_MATCH',
  'OFFICIAL_SOCIAL_MATCH',
  // Absence of evidence (never on its own a reason to call something a scam)
  'UNKNOWN_PHONE',
  'MOBILE_NUMBER',
  'UNKNOWN_LOCATION',
  'PARTIAL_LOCATION_MATCH',
  'UNKNOWN_LINK',
  'UNKNOWN_EMAIL',
  'UNKNOWN_USSD',
  'UNVERIFIED_MUKURU_ADDRESS',
  'NO_CHECKABLE_DETAILS',
  'COMMUNITY_REPORTS',
  'NEW_RECIPIENT',
  'RECIPIENT_VERIFIED',
  'RECIPIENT_PROOF_REQUIRED',
  'RECIPIENT_PROOF_INVALID',
  'RECIPIENT_PROOF_NOT_FOUND',
  'RECIPIENT_PROOF_EXPIRED',
  'RECIPIENT_PROOF_REVOKED',
  'RECIPIENT_IDENTITY_NOT_VERIFIED',
  'RECIPIENT_OWNERSHIP_NOT_VERIFIED',
  'RECIPIENT_ACCOUNT_INACTIVE',
  'RECIPIENT_CANNOT_RECEIVE_CREDITS',
  'RECIPIENT_VERIFICATION_UNAVAILABLE',
  // Link / identity contradictions
  'LOOKALIKE_DOMAIN',
  'LOOKALIKE_ALPHABET',
  'DECEPTIVE_LINK',
  'MUKURU_NAME_IN_LINK',
  'UNKNOWN_LINK_IN_MUKURU_MESSAGE',
  'IMPERSONATION_CLAIM',
  'REPORTED_ENTITY',
  // Sensitive-data requests
  'REQUESTS_PIN',
  'REQUESTS_OTP',
  'REQUESTS_PASSWORD',
  'REQUESTS_CARD_DETAILS',
  'REQUESTS_PERSONAL_INFORMATION',
  'RECIPIENT_PROOF_MISMATCH',
  // Money / pressure patterns
  'UPFRONT_FEE',
  'RELEASE_FEE',
  'URGENT_PAYMENT',
  'ACCOUNT_BLOCK_THREAT',
  'VERIFY_ACCOUNT_REQUEST',
  'FAKE_JOB_CONTEXT',
  'STAY_ON_CALL_PRESSURE',
  'SECRECY_PRESSURE',
  'ROMANCE_MONEY_REQUEST',
] as const;
export type ReasonCode = (typeof REASON_CODES)[number];

export interface OfficialRecordSummary {
  id: string;
  type: 'PHONE' | 'WHATSAPP' | 'DOMAIN' | 'EMAIL' | 'USSD' | 'SMS_SHORTCODE' | 'SOCIAL' | 'LOCATION';
  value: string;
  label: string;
  source: string;
}

export interface Analysis {
  input: string;
  inputType: InputType;
  entities: Entity[];
  /** Signals derived from the input alone (no community data). */
  signals: Signal[];
  /** True when text outside the detected contacts mentions Mukuru. */
  mukuruClaim: boolean;
  /** Fingerprint used to report a message that contains no contact details. */
  messageKey: string | null;
  truncated: boolean;
}

export interface CheckResult {
  verdict: Verdict;
  inputType: InputType;
  reasonCodes: ReasonCode[];
  /** Ordered most-important first. */
  signals: Signal[];
  entities: Entity[];
  matchedOfficialRecord: OfficialRecordSummary | null;
  reportCount: number;
  /** Keys the customer may report (never official records). */
  reportableKeys: string[];
  truncated: boolean;
}
