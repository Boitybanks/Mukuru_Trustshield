import { forwardRef } from 'react';
import {
  BriefcaseBusiness,
  Globe2,
  Hash,
  KeyRound,
  Link2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  PhoneOff,
  ShieldAlert,
  Smartphone,
  WalletCards,
} from 'lucide-react';
import { OFFICIAL_CHANNELS } from '../../data/officialRegistry';
import { useI18n } from '../../i18n/I18nProvider';

/** Safe shortcuts to Mukuru's real channels — the "what now?" for every uncertain result. */
export const OfficialContacts = forwardRef<HTMLElement>(function OfficialContacts(_props, ref) {
  const { t } = useI18n();
  const rows = [
    { href: OFFICIAL_CHANNELS.callHref, icon: Phone, label: t('official.call'), value: OFFICIAL_CHANNELS.callDisplay },
    {
      href: OFFICIAL_CHANNELS.whatsappHref,
      icon: MessageCircle,
      label: t('official.whatsapp'),
      value: OFFICIAL_CHANNELS.whatsappDisplay,
      external: true,
    },
    { href: `tel:${encodeURIComponent(OFFICIAL_CHANNELS.ussd)}`, icon: Hash, label: t('official.ussd'), value: OFFICIAL_CHANNELS.ussd },
    { href: OFFICIAL_CHANNELS.emailHref, icon: Mail, label: t('official.email'), value: OFFICIAL_CHANNELS.email },
    { href: `mailto:${OFFICIAL_CHANNELS.fraudEmail}`, icon: ShieldAlert, label: t('official.fraud'), value: OFFICIAL_CHANNELS.fraudEmail },
    { href: OFFICIAL_CHANNELS.website, icon: Globe2, label: t('official.website'), value: 'www.mukuru.com/sa', external: true },
    { href: OFFICIAL_CHANNELS.findUsPage, icon: MapPin, label: t('official.findUs'), value: 'mukuru.com/sa/find-us', external: true },
  ];
  return (
    <section ref={ref} className="card" aria-labelledby="official-title" id="official-contacts" tabIndex={-1}>
      <h2 className="section-title" id="official-title">
        <ShieldAlert size={22} aria-hidden="true" />
        {t('official.title')}
      </h2>
      <p className="small muted official-note">{t('official.note')}</p>
      <ul className="contact-list">
        {rows.map(({ href, icon: Icon, label, value, external }) => (
          <li key={href}>
            <a href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
              <span className="contact-icon" aria-hidden="true">
                <Icon size={20} />
              </span>
              <span>
                <span className="contact-label">{label}</span>
                <span className="contact-value">{value}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
      <p className="source-line official-hours">{t('official.hours')}</p>
    </section>
  );
});

const SIGNS = [
  { icon: KeyRound, key: 'learn.pin' },
  { icon: Smartphone, key: 'learn.mobile' },
  { icon: BriefcaseBusiness, key: 'learn.job' },
  { icon: WalletCards, key: 'learn.release' },
  { icon: Link2, key: 'learn.link' },
  { icon: PhoneOff, key: 'learn.call' },
] as const;

/** Scam education in one glance: six rules, each with a meaningful icon. */
export function KnowTheSigns() {
  const { t } = useI18n();
  return (
    <section className="card" aria-labelledby="signs-title">
      <h2 className="section-title" id="signs-title">
        {t('learn.title')}
      </h2>
      <ul className="signs">
        {SIGNS.map(({ icon: Icon, key }) => (
          <li key={key}>
            <span className="contact-icon" aria-hidden="true">
              <Icon size={18} />
            </span>
            <span>{t(key)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
