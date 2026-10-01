import type { ReasonCode, Severity } from '../types';

/**
 * The rule catalogue: every reason code has exactly one severity.
 * Plain-language reasons and recommended actions live in the i18n
 * dictionaries under `reasons.<CODE>.text` / `reasons.<CODE>.action`, so
 * every rule is explainable in English, Portuguese and Shona.
 */
export const RULE_SEVERITY: Record<ReasonCode, Severity> = {
  OFFICIAL_PHONE_MATCH: 'positive',
  OFFICIAL_DOMAIN_MATCH: 'positive',
  OFFICIAL_LOCATION_MATCH: 'positive',
  OFFICIAL_EMAIL_MATCH: 'positive',
  OFFICIAL_USSD_MATCH: 'positive',
  OFFICIAL_SMS_MATCH: 'positive',
  OFFICIAL_SOCIAL_MATCH: 'positive',

  UNKNOWN_PHONE: 'info',
  UNKNOWN_LOCATION: 'info',
  PARTIAL_LOCATION_MATCH: 'info',
  UNKNOWN_LINK: 'info',
  UNKNOWN_EMAIL: 'info',
  UNKNOWN_USSD: 'info',
  UNVERIFIED_MUKURU_ADDRESS: 'info',
  NO_CHECKABLE_DETAILS: 'info',
  COMMUNITY_REPORTS: 'info',
  NEW_RECIPIENT: 'info',
  RECIPIENT_VERIFIED: 'positive',

  MUKURU_NAME_IN_LINK: 'medium',
  MOBILE_NUMBER: 'medium',
  UPFRONT_FEE: 'medium',
  URGENT_PAYMENT: 'medium',
  ACCOUNT_BLOCK_THREAT: 'medium',
  VERIFY_ACCOUNT_REQUEST: 'medium',
  FAKE_JOB_CONTEXT: 'medium',
  STAY_ON_CALL_PRESSURE: 'medium',
  SECRECY_PRESSURE: 'medium',
  ROMANCE_MONEY_REQUEST: 'medium',
  REQUESTS_PERSONAL_INFORMATION: 'medium',

  LOOKALIKE_DOMAIN: 'high',
  LOOKALIKE_ALPHABET: 'high',
  DECEPTIVE_LINK: 'high',
  UNKNOWN_LINK_IN_MUKURU_MESSAGE: 'high',
  IMPERSONATION_CLAIM: 'high',
  REPORTED_ENTITY: 'high',
  RELEASE_FEE: 'high',

  REQUESTS_PIN: 'critical',
  REQUESTS_OTP: 'critical',
  REQUESTS_PASSWORD: 'critical',
  REQUESTS_CARD_DETAILS: 'critical',
  RECIPIENT_PROOF_MISMATCH: 'critical',
};

export const SEVERITY_RANK: Record<Severity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  positive: 2,
  info: 1,
};

/**
 * Codes that are fully explained by a more specific code. They stay in
 * `reasonCodes` (for API consumers) but are not repeated in the customer's
 * "Why" list when the more specific code is present.
 */
export const SUBSUMED_BY: Partial<Record<ReasonCode, ReasonCode[]>> = {
  UNKNOWN_LINK: [
    'LOOKALIKE_DOMAIN',
    'LOOKALIKE_ALPHABET',
    'DECEPTIVE_LINK',
    'UNKNOWN_LINK_IN_MUKURU_MESSAGE',
    'MUKURU_NAME_IN_LINK',
  ],
  UNKNOWN_PHONE: ['IMPERSONATION_CLAIM'],
  UNKNOWN_EMAIL: ['IMPERSONATION_CLAIM', 'LOOKALIKE_DOMAIN'],
  COMMUNITY_REPORTS: ['REPORTED_ENTITY'],
  UNKNOWN_LOCATION: ['PARTIAL_LOCATION_MATCH'],
  MUKURU_NAME_IN_LINK: ['UNKNOWN_LINK_IN_MUKURU_MESSAGE', 'LOOKALIKE_DOMAIN'],
};
