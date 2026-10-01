/**
 * OFFICIAL MUKURU REGISTRY — the source of truth for "Is this really Mukuru?".
 *
 * Every entry records the public Mukuru page it was taken from (retrieved
 * 2026-10-01). Mukuru is the authority: nothing here comes from third-party
 * listings. See docs/DATA_SOURCES.md for the exact quotes.
 *
 * demoStatus:
 *  - PUBLIC_MUKURU_SOURCE: copied from Mukuru's own public website.
 *  - SIMULATED: invented for the hackathon demo and labelled as such in the UI.
 */
import { OFFICIAL_LOCATIONS } from './officialLocations';
import type { OfficialLocation } from './officialLocations';

export type DemoStatus = 'PUBLIC_MUKURU_SOURCE' | 'SIMULATED';

export type OfficialContactType = 'PHONE' | 'WHATSAPP' | 'EMAIL' | 'USSD' | 'SMS_SHORTCODE' | 'DOMAIN' | 'SOCIAL';

export interface OfficialContact {
  id: string;
  /** Canonical value: E.164 for phones, lowercase host for domains, host+path for social pages. */
  value: string;
  type: OfficialContactType;
  country: 'ZA';
  /** i18n key under `registry.` used to label the record. */
  labelKey: RegistryLabelKey;
  /** Friendly display form, e.g. "0860 018 555". */
  display: string;
  source: string;
  verifiedAt: string;
  demoStatus: DemoStatus;
}

export type RegistryLabelKey =
  | 'callCentre'
  | 'whatsapp'
  | 'claimsLine'
  | 'email'
  | 'fraudEmail'
  | 'ussd'
  | 'shortcode'
  | 'website'
  | 'social';

export const SOURCES = {
  home: 'https://www.mukuru.com/sa/',
  help: 'https://www.mukuru.com/sa/help-support/',
  contact: 'https://www.mukuru.com/sa/help-support/contact-us/',
  faqs: 'https://www.mukuru.com/sa/help-support/faqs/',
  fraud: 'https://www.mukuru.com/sa/fraud-prevention/',
  findUs: 'https://www.mukuru.com/sa/find-us/',
  mediaKit: 'https://www.mukuru.com/about-us/press-media-kit/',
} as const;

const VERIFIED_AT = '2026-10-01';

function contact(c: Omit<OfficialContact, 'country' | 'verifiedAt' | 'demoStatus'>): OfficialContact {
  return { ...c, country: 'ZA', verifiedAt: VERIFIED_AT, demoStatus: 'PUBLIC_MUKURU_SOURCE' };
}

export const OFFICIAL_CONTACTS: readonly OfficialContact[] = [
  contact({ id: 'za-call-centre', value: '+27860018555', type: 'PHONE', labelKey: 'callCentre', display: '0860 018 555', source: SOURCES.help }),
  contact({ id: 'za-whatsapp', value: '+27860018555', type: 'WHATSAPP', labelKey: 'whatsapp', display: '+27 86 001 8555', source: SOURCES.help }),
  contact({ id: 'za-claims-line', value: '+27860018556', type: 'PHONE', labelKey: 'claimsLine', display: '0860 018 556', source: SOURCES.faqs }),
  contact({ id: 'za-support-email', value: 'support@mukuru.com', type: 'EMAIL', labelKey: 'email', display: 'support@mukuru.com', source: SOURCES.help }),
  contact({ id: 'za-fraud-email', value: 'fraud@mukuru.com', type: 'EMAIL', labelKey: 'fraudEmail', display: 'fraud@mukuru.com', source: SOURCES.fraud }),
  contact({ id: 'za-cyberhelp-email', value: 'cyberhelp@mukuru.com', type: 'EMAIL', labelKey: 'fraudEmail', display: 'cyberhelp@mukuru.com', source: SOURCES.fraud }),
  contact({ id: 'za-claims-email', value: 'claims@mukuru.com', type: 'EMAIL', labelKey: 'email', display: 'claims@mukuru.com', source: SOURCES.faqs }),
  contact({ id: 'za-wallet-email', value: 'wallet@mukuru.com', type: 'EMAIL', labelKey: 'email', display: 'wallet@mukuru.com', source: SOURCES.faqs }),
  contact({ id: 'za-media-email', value: 'communications@mukuru.com', type: 'EMAIL', labelKey: 'email', display: 'communications@mukuru.com', source: SOURCES.mediaKit }),
  contact({ id: 'za-ussd', value: '*130*567#', type: 'USSD', labelKey: 'ussd', display: '*130*567#', source: SOURCES.help }),
  contact({ id: 'za-ussd-card', value: '*130*566#', type: 'USSD', labelKey: 'ussd', display: '*130*566#', source: SOURCES.faqs }),
  contact({ id: 'za-sms-34246', value: '34246', type: 'SMS_SHORTCODE', labelKey: 'shortcode', display: '34246', source: SOURCES.faqs }),
  contact({ id: 'web-mukuru-com', value: 'mukuru.com', type: 'DOMAIN', labelKey: 'website', display: 'mukuru.com', source: SOURCES.home }),
  contact({ id: 'web-www-mukuru-com', value: 'www.mukuru.com', type: 'DOMAIN', labelKey: 'website', display: 'www.mukuru.com', source: SOURCES.home }),
  contact({ id: 'web-mobile', value: 'mobile.mukuru.com', type: 'DOMAIN', labelKey: 'website', display: 'mobile.mukuru.com', source: SOURCES.faqs }),
  contact({ id: 'web-online', value: 'online.mukuru.com', type: 'DOMAIN', labelKey: 'website', display: 'online.mukuru.com', source: SOURCES.faqs }),
  contact({ id: 'web-enterprise', value: 'enterprise.mukuru.com', type: 'DOMAIN', labelKey: 'website', display: 'enterprise.mukuru.com', source: SOURCES.home }),
  contact({ id: 'web-moneymatters', value: 'moneymatters.mukuru.com', type: 'DOMAIN', labelKey: 'website', display: 'moneymatters.mukuru.com', source: SOURCES.home }),
  contact({ id: 'social-facebook', value: 'facebook.com/mukurudotcom', type: 'SOCIAL', labelKey: 'social', display: 'facebook.com/mukurudotcom', source: SOURCES.home }),
  contact({ id: 'social-x', value: 'x.com/mukurudotcom', type: 'SOCIAL', labelKey: 'social', display: 'x.com/mukurudotcom', source: SOURCES.home }),
  contact({ id: 'social-twitter', value: 'twitter.com/mukurudotcom', type: 'SOCIAL', labelKey: 'social', display: 'twitter.com/mukurudotcom', source: SOURCES.home }),
  contact({ id: 'social-instagram', value: 'instagram.com/mukurudotcom', type: 'SOCIAL', labelKey: 'social', display: 'instagram.com/mukurudotcom', source: SOURCES.home }),
  contact({ id: 'social-tiktok', value: 'tiktok.com/@mukurudotcom', type: 'SOCIAL', labelKey: 'social', display: 'tiktok.com/@mukurudotcom', source: SOURCES.home }),
  contact({ id: 'social-linkedin', value: 'linkedin.com/company/mukuru', type: 'SOCIAL', labelKey: 'social', display: 'linkedin.com/company/mukuru', source: SOURCES.home }),
  contact({ id: 'social-youtube', value: 'youtube.com/@mukuru', type: 'SOCIAL', labelKey: 'social', display: 'youtube.com/@mukuru', source: SOURCES.home }),
];

/** Exact approved hostnames. A host is OFFICIAL only if it is in this set — never by substring. */
export const OFFICIAL_HOSTS: ReadonlySet<string> = new Set(
  OFFICIAL_CONTACTS.filter((c) => c.type === 'DOMAIN').map((c) => c.value),
);

/** Domains Mukuru controls. Unlisted subdomains are "can't confirm", never auto-trusted. */
export const OFFICIAL_REGISTRABLE_DOMAINS: ReadonlySet<string> = new Set(['mukuru.com']);

/** The brand string look-alike detection protects. */
export const BRAND_TOKEN = 'mukuru';

export function findOfficialPhone(e164: string): OfficialContact | undefined {
  return OFFICIAL_CONTACTS.find((c) => (c.type === 'PHONE' || c.type === 'WHATSAPP') && c.value === e164);
}

export function findOfficialEmail(address: string): OfficialContact | undefined {
  const lower = address.toLowerCase();
  return OFFICIAL_CONTACTS.find((c) => c.type === 'EMAIL' && c.value === lower);
}

export function findOfficialUssd(code: string): OfficialContact | undefined {
  return OFFICIAL_CONTACTS.find((c) => c.type === 'USSD' && c.value === code);
}

export function findOfficialShortcode(code: string): OfficialContact | undefined {
  return OFFICIAL_CONTACTS.find((c) => c.type === 'SMS_SHORTCODE' && c.value === code);
}

export function findOfficialHost(hostname: string): OfficialContact | undefined {
  return OFFICIAL_CONTACTS.find((c) => c.type === 'DOMAIN' && c.value === hostname);
}

/** Matches an official social profile: exact host (www./m. allowed) and the profile path or below it. */
export function findOfficialSocial(hostname: string, pathname: string): OfficialContact | undefined {
  const host = hostname.replace(/^(www|m|mobile)\./, '');
  const path = pathname.toLowerCase().replace(/\/+$/, '');
  return OFFICIAL_CONTACTS.find((c) => {
    if (c.type !== 'SOCIAL') return false;
    const slash = c.value.indexOf('/');
    const socialHost = c.value.slice(0, slash);
    const socialPath = c.value.slice(slash);
    return host === socialHost && (path === socialPath || path.startsWith(`${socialPath}/`));
  });
}

export function findOfficialRecord(id: string): OfficialContact | OfficialLocation | undefined {
  return OFFICIAL_CONTACTS.find((c) => c.id === id) ?? OFFICIAL_LOCATIONS.find((l) => l.id === id);
}

export { OFFICIAL_LOCATIONS };
export type { OfficialLocation };

/** The official channels shown in "Official contact options". */
export const OFFICIAL_CHANNELS = {
  callDisplay: '0860 018 555',
  callHref: 'tel:+27860018555',
  whatsappDisplay: '+27 86 001 8555',
  whatsappHref: 'https://wa.me/27860018555',
  ussd: '*130*567#',
  email: 'support@mukuru.com',
  emailHref: 'mailto:support@mukuru.com',
  fraudEmail: 'fraud@mukuru.com',
  website: 'https://www.mukuru.com/sa/',
  fraudPage: SOURCES.fraud,
  findUsPage: SOURCES.findUs,
  hours: 'Mon–Sat 08:00–19:00, Sun 08:00–12:00',
} as const;
