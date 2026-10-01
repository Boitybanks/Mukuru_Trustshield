import type { ReasonCode, Signal } from '../types';
import { RULE_SEVERITY } from './catalogue';
import { foldForMatching } from '../normalisation/text';
import { brandSkeleton } from '../normalisation/punycode';
import { editDistance } from '../normalisation/similarity';

/*
 * Deterministic, explainable message rules in English, Portuguese
 * (Mozambican usage) and Shona. Patterns run on folded text: lowercase,
 * accents removed ("não" → "nao", "código" → "codigo").
 *
 * No external AI is involved: every flag maps to a documented pattern and a
 * plain-language reason in three languages.
 */

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

/** Safety advice ("never share your PIN", "não partilhe", "usatumira") must not trigger alarms. */
const NEGATION =
  /\b(never|don'?t|do not|not to|should not|shouldn'?t|will not|won'?t|nunca|jamais|nao (partilhe|compartilhe|envie|de|diga|mande|forneca|revele|responda|pague|deve|pedimos|pede|pedira|vai pedir)|m?usa(tumir|p|udz|gover|ratidz|nyor|bhadhar|dzvany|vhur)[a-z]*|ha[a-z]*(mbo|tombo)[a-z]*)\b/g;

/** "and", "then", "but" between a negation and a request break the negation ("don't hang up and send the OTP"). */
const CONJUNCTION = /\b(and|then|but|so|now|e|depois|mas|agora|uye|wobva|bva|asi)\b/;

const REQUEST =
  /\b(send|share|give|tell|reply|provide|confirm|enter|type|forward|read|sms|whatsapp|text|submit|need|require|want|what is|what'?s|let me have|envi[ae]\w*|mand[ae]\w*|partilh\w*|compartilh\w*|diga|confirm[ae]\w*|digit[ae]\w*|forne[cç]\w*|informe|responda|insira|introduza|preciso|precisamos|qual (e|o)|tumira\w*|ndi(pe|pei|tumire|tumirei|udze|udzei)|ti(pe|pei|tumire|udze|udzei)|taura|nyora|ipa)\b/;

const POSSESSIVE = /\b(your|o seu|a sua|seu|sua|teu|tua|yako|yenyu|rako|renyu|kwako)\b/;

const AMOUNT =
  /(\b(r|zar|mzn|mt|usd|us\$)\s?\d[\d\s,.]*|\$\s?\d+|\b\d[\d,.]*\s?(rand|randi|meticais|mt|mzn|usd|dollars?|madhora)\b)/;

/**
 * A demand that YOU pay. "Send money" alone is Mukuru's everyday product
 * language, so it only counts when the money goes to the sender ("send us R250").
 */
const PAY_DEMAND =
  /\b(pay|paying|payment of|deposit|buy (an? )?(voucher|airtime)|send (it )?(to )?(us|me) (r ?\d|\$|the money|money|cash)|pague|pagar|pagamento de|deposit[ae]|transfir[ae] para (nos|mim)|envi[ae]-?(nos|me) (o )?dinheiro|mande-?(nos|me) (o )?dinheiro|bhadhara\w*|isa mari|deposita|ndi ?tumire(i)? mari|ti ?tumire(i)? mari)\b/;

const FEE_WORD = /\b(fee|fees|levy|charge|charges|taxa|taxas|tarifa|emolumento|muripo|mari yeku[a-z]+)\b/;

/** Named up-front fees — common in fake-job and fake-prize scams. */
const FEE_PHRASE =
  /\b((registration|joining|application|activation|admin|administration|processing|verification|training|uniform|placement|booking|medical|interview|membership|starter kit|onboarding|account opening) (fee|fees|charge|levy)|taxa de (inscricao|registo|registro|activacao|ativacao|processamento|verificacao|formacao|candidatura|adesao|entrevista|uniforme|abertura)|mari ye(kunyoresa|fomu|kutanga|kuvhura))\b/;

/** "We need R850 to activate your account" — an amount tied to unlocking/starting something. */
const AMOUNT_FOR_PURPOSE =
  /(\b(r|zar|mzn|mt|usd|us\$)\s?\d[\d\s,.]*|\$\s?\d+|\b\d[\d,.]*\s?(rand|meticais|mt|usd|dollars?))\s+(\w+\s+){0,3}(to|for|para|kuti|yeku)\s+(\w+\s+)?(activat|activ|ativ|register|registr|unlock|desbloque|verif|process|open|abrir|secure|garanti|start|comec|confirm|vhur|nyores|simbis|tang)\w*/;

const URGENCY =
  /\b(urgent|urgently|immediately|right now|asap|today|tonight|now|within \d+ ?(hours?|hrs?|minutes?|mins?)|in \d+ ?(hours?|minutes?)|last chance|final (notice|warning|reminder)|expires? (today|soon|tonight)|before (midnight|tomorrow)|hurry|quickly|urgente|imediatamente|agora|hoje|ate hoje|ultima (oportunidade|chance)|rapidamente|depressa|dentro de \d+ ?(horas?|minutos?)|nekukurumidza|izvozvi|nhasi|chimbidza\w*|nguva (yapera|iri kupera))\b/;

const CREDENTIALS: { code: ReasonCode; pattern: RegExp }[] = [
  {
    code: 'REQUESTS_OTP',
    pattern:
      /\b(otp|one[\s-]?time[\s-]?(pin|password|code)|verification code|security code|confirmation code|auth(entication)? code|sms code|\d[\s-]?digit code|code (we|i) sent|code (you )?(received|got)|code sent to (your|you)|codigo (otp|de verificacao|de confirmacao|de seguranca|sms|de acesso|que (recebeu|enviamos|enviei))|kodhi|kodi (yawa|yamu|yawatumirwa|yatumirwa))\b/,
  },
  { code: 'REQUESTS_PIN', pattern: /\b(pin|pin code|pin number|codigo pin)\b/ },
  {
    code: 'REQUESTS_PASSWORD',
    pattern: /\b(password|passcode|log ?in details|palavra[\s-]?passe|senha|pasiwedhi)\b/,
  },
  {
    code: 'REQUESTS_CARD_DETAILS',
    pattern:
      /\b((?<!digits of (your |the )?)card (number|details)|cvv|cvc|expiry date|bank card|numero do cartao|dados do cartao|codigo do cartao|nhamba ye ?kadhi|kadhi yako|card yako)\b/,
  },
  {
    code: 'REQUESTS_PERSONAL_INFORMATION',
    pattern:
      /\b(id (number|document|copy)|identity (number|document)|copy of (your )?id|passport (number|copy)|date of birth|bank(ing)? details|account number|selfie|numero do bi|bilhete de identidade|documento de identificacao|numero de identificacao|passaporte|data de nascimento|nhamba ye ?(id|chitupa)|chitupa|pasipoti|zuva rekuzvarwa)\b/,
  },
];

const RELEASE_CONTEXT =
  /((release|clearance|unlock|unlocking|customs) (fee|fees|charge)|fee (to|before) (we )?(can )?(release|unlock|clear)|to (release|unlock|clear|receive|collect) (your|the) (money|funds|payment|transfer|parcel|package|prize|winnings|cash)|(money|funds|payment|transfer|parcel) (is|are|has been|have been) (on hold|held|pending|stuck)|taxa de (libertacao|liberacao|desbloqueio|levantamento|alfandega)|para (libertar|liberar|desbloquear|levantar|receber) (o seu |o |a sua |seu |a )?(dinheiro|transferencia|premio|pagamento)|kuti (mari|transfer)( yako| yenyu)? (ibudiswe|iburitswe|isunungurwe|ivhurwe|iuye|isvike)|mari yekuburitsa|kusunungura mari)/;

const ACCOUNT_THREAT =
  /(\b(account|wallet|profile|card|mukuru|payment|transfer|money|funds|sim)\W+(\w+\W+){0,4}(blocked|block|suspended|suspend|closed|frozen|freeze|deactivated|deactivate|disabled|disable|locked|terminated|cancelled|canceled|restricted)\b|\b(block|suspend|close|freeze|deactivate|disable|lock|terminate|cancel|restrict)\w*\W+(\w+\W+){0,3}(account|wallet|profile)\b|\b(conta|carteira|cartao|transferencia)\W+(\w+\W+){0,4}(bloquead|suspens|encerrad|cancelad|desactivad|desativad|congelad|fechad)\w*|\b(bloque|suspend|encerr|desactiv|desativ|congel)\w*\W+(\w+\W+){0,3}(conta|carteira|cartao)\b|\b(akaundi|account)\W+(\w+\W+){0,3}\w*(vharwa|miswa|kiyiwa|bviswa|blockwa|blocked))/;

const VERIFY_ACCOUNT =
  /(\b(verify|confirm|update|validate|re-?activate|unlock|upgrade)\s+(your\s+|the\s+)?(mukuru\s+)?(account|details|information|info|identity|kyc|profile|wallet|banking)\b|click (the |this )?(link|here) to (verify|confirm|update|unlock|activate)|\b(verifique|confirme|actualize|atualize|valide|reactive|reative|desbloqueie)\s+(a sua |sua |os seus |seus |o seu |a )?(conta|dados|informac\w*|identidade|perfil|carteira)|\b(simbisa|simbisai|vandudza|vandudzai|gadzirisa|gadzirisai)\s+(\w+\s+)?(akaundi|account|ruzivo|zvinyorwa|details))/;

const JOB_CONTEXT =
  /\b(job|jobs|employment|employer|vacancy|vacancies|hiring|recruit\w*|interview|salary|wages?|work (opportunity|offer|permit|from home|abroad)|start work|get (the |a )?work|position (is )?available|internship|learnership|emprego|empregos|trabalho|vaga|vagas|recrutamento|entrevista|salario|empregador|basa|mabasa|mushando|muhoro|kuhaya|kushanda)\b/;

const STAY_ON_CALL =
  /(stay on the (phone|line|call)|don'?t (hang up|end the call|put the phone down|drop the call)|do not (hang up|end the call)|keep (the line open|me on the line|the call going)|i('| wi)ll (guide|show|walk) you (through|where|how)|(nao|nunca) desligue|fique (na linha|ao telefone|em linha|comigo)|mantenha a (chamada|linha)|vou (te |lhe )?(guiar|mostrar|explicar) (onde|como)|m?usadzime|regai foni|ramba uri (pa|mu)(foni|runhare)|ndichaku(ratidza|tungamirira))/;

const SECRECY =
  /(don'?t tell (anyone|anybody|your family|the bank|mukuru)|do not tell (anyone|anybody)|keep (this|it) (a )?(secret|confidential|between us)|nao (conte|diga) (a|para) ninguem|segredo|mantenha (isto|isso) em segredo|m?usaudza (munhu|vamwe|ani)|chakavanzika|zvakavanzika)/;

const ROMANCE =
  /\b(my love|my darling|darling|honey|sweetheart|babe|my baby|my dear|meu amor|querid[ao]|mudiwa|mudiwa wangu)\b/;
const ROMANCE_ASK =
  /\b(send (me )?(money|cash|r ?\d)|envi[ae]-?me (o )?dinheiro|manda-?me|ndi ?tumire(i)? mari|tumira mari)\b/;

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

function clauses(folded: string): string[] {
  return folded
    .split(/[.!?\n;:,]+/)
    .map((c) => c.trim())
    .filter(Boolean);
}

/**
 * True when a negation ("never", "não partilhe", "usatumira") comes BEFORE
 * the matched term in the same clause with no "and/then/but" in between.
 */
function isNegated(part: string, termIndex: number): boolean {
  for (const m of part.matchAll(NEGATION)) {
    const at = m.index ?? 0;
    if (at > termIndex) break;
    const between = part.slice(at + m[0].length, termIndex);
    if (!CONJUNCTION.test(between)) return true;
  }
  return false;
}

/** Matches the pattern in the clause unless that occurrence is negated. */
function assertive(part: string, pattern: RegExp): boolean {
  const m = pattern.exec(part);
  return m !== null && !isNegated(part, m.index);
}

function signal(code: ReasonCode): Signal {
  return { code, severity: RULE_SEVERITY[code] };
}

/** True when text outside the detected contact details mentions Mukuru (incl. misspellings). */
export function detectMukuruClaim(textWithoutEntities: string): boolean {
  const words = brandSkeleton(textWithoutEntities)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  return words.some((w) => w.includes('mukuru') || (w.length >= 5 && w.length <= 8 && editDistance(w, 'mukuru') <= 1));
}

/**
 * Applies every content rule. `text` should already have contact details
 * (links, numbers) removed so "mukuru-pay.com" is not read as a claim.
 */
export function evaluateContent(text: string): Signal[] {
  const folded = foldForMatching(text);
  if (!folded) return [];
  const found = new Set<ReasonCode>();
  const parts = clauses(folded);

  let moneyDemanded = false;
  for (const part of parts) {
    for (const { code, pattern } of CREDENTIALS) {
      if (assertive(part, pattern) && (REQUEST.test(part) || POSSESSIVE.test(part))) found.add(code);
    }
    const demand = assertive(part, PAY_DEMAND);
    if (demand) moneyDemanded = true;
    if (
      assertive(part, FEE_PHRASE) ||
      assertive(part, AMOUNT_FOR_PURPOSE) ||
      (demand && (AMOUNT.test(part) || FEE_WORD.test(part)))
    ) {
      found.add('UPFRONT_FEE');
      moneyDemanded = true;
    }
    if (assertive(part, RELEASE_CONTEXT)) found.add('RELEASE_FEE');
    if (assertive(part, ACCOUNT_THREAT)) found.add('ACCOUNT_BLOCK_THREAT');
    if (assertive(part, VERIFY_ACCOUNT)) found.add('VERIFY_ACCOUNT_REQUEST');
    if (STAY_ON_CALL.test(part)) found.add('STAY_ON_CALL_PRESSURE');
    if (SECRECY.test(part)) found.add('SECRECY_PRESSURE');
  }

  // A release story only counts when the message also asks for money somewhere.
  if (found.has('RELEASE_FEE') && !(moneyDemanded || AMOUNT.test(folded) || FEE_WORD.test(folded))) {
    found.delete('RELEASE_FEE');
  }
  if (moneyDemanded && URGENCY.test(folded)) found.add('URGENT_PAYMENT');
  if (JOB_CONTEXT.test(folded)) found.add('FAKE_JOB_CONTEXT');
  if (ROMANCE.test(folded) && (ROMANCE_ASK.test(folded) || PAY_DEMAND.test(folded))) found.add('ROMANCE_MONEY_REQUEST');

  return Array.from(found, signal);
}
