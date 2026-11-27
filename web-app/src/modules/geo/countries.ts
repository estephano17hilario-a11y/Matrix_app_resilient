// Countries and currencies. Names come from Intl.DisplayNames in the app language, so the list
// stays small (ISO code → currency) and every country / currency of the world is searchable.

export const COUNTRY_KEY = 'lux_country';
export const COUNTRY_EVENT = 'lux:country';

/** ISO 3166 code → ISO 4217 currency. */
const CURRENCY_OF: Record<string, string> = {
  // Spanish-speaking
  AR: 'ARS', BO: 'BOB', CL: 'CLP', CO: 'COP', CR: 'CRC', CU: 'CUP', DO: 'DOP', EC: 'USD', SV: 'USD', GQ: 'XAF',
  GT: 'GTQ', HN: 'HNL', MX: 'MXN', NI: 'NIO', PA: 'PAB', PY: 'PYG', PE: 'PEN', PR: 'USD', ES: 'EUR', UY: 'UYU', VE: 'VES',
  // Americas
  US: 'USD', CA: 'CAD', BR: 'BRL', BZ: 'BZD', HT: 'HTG', JM: 'JMD', TT: 'TTD', BS: 'BSD', BB: 'BBD', GY: 'GYD', SR: 'SRD',
  // Europe
  GB: 'GBP', IE: 'EUR', FR: 'EUR', DE: 'EUR', IT: 'EUR', PT: 'EUR', NL: 'EUR', BE: 'EUR', LU: 'EUR', AT: 'EUR', FI: 'EUR',
  GR: 'EUR', SK: 'EUR', SI: 'EUR', EE: 'EUR', LV: 'EUR', LT: 'EUR', MT: 'EUR', CY: 'EUR', HR: 'EUR', AD: 'EUR', MC: 'EUR',
  CH: 'CHF', NO: 'NOK', SE: 'SEK', DK: 'DKK', IS: 'ISK', PL: 'PLN', CZ: 'CZK', HU: 'HUF', RO: 'RON', BG: 'BGN', RS: 'RSD',
  UA: 'UAH', RU: 'RUB', TR: 'TRY', AL: 'ALL', BA: 'BAM', MK: 'MKD', MD: 'MDL', GE: 'GEL', AM: 'AMD', BY: 'BYN',
  // Asia / Oceania
  CN: 'CNY', JP: 'JPY', KR: 'KRW', IN: 'INR', ID: 'IDR', PH: 'PHP', VN: 'VND', TH: 'THB', MY: 'MYR', SG: 'SGD', HK: 'HKD',
  TW: 'TWD', PK: 'PKR', BD: 'BDT', LK: 'LKR', NP: 'NPR', AU: 'AUD', NZ: 'NZD', KZ: 'KZT', UZ: 'UZS', AE: 'AED', SA: 'SAR',
  QA: 'QAR', KW: 'KWD', IL: 'ILS', JO: 'JOD', LB: 'LBP', IR: 'IRR', IQ: 'IQD',
  // Africa
  ZA: 'ZAR', NG: 'NGN', EG: 'EGP', MA: 'MAD', KE: 'KES', GH: 'GHS', DZ: 'DZD', TN: 'TND', ET: 'ETB', TZ: 'TZS', UG: 'UGX',
  SN: 'XOF', CI: 'XOF', CM: 'XAF', AO: 'AOA',
};

const SPANISH = new Set(['AR', 'BO', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'SV', 'GQ', 'GT', 'HN', 'MX', 'NI', 'PA', 'PY', 'PE', 'PR', 'ES', 'UY', 'VE']);
/** Shown first (most of Lux's users). */
export const POPULAR = ['MX', 'CO', 'PE', 'AR', 'CL', 'ES', 'US', 'EC', 'VE', 'GT', 'DO', 'BO'];

export const COUNTRY_CODES = Object.keys(CURRENCY_OF);

export const currencyForCountry = (code?: string | null) => (code && CURRENCY_OF[code.toUpperCase()]) || 'USD';
export const languageForCountry = (code?: string | null): 'es' | 'en' => (code && SPANISH.has(code.toUpperCase()) ? 'es' : 'en');

const displayNames = new Map<string, Intl.DisplayNames | null>();
const dn = (lang: string, type: 'region' | 'currency') => {
  const key = `${lang}:${type}`;
  if (!displayNames.has(key)) {
    try { displayNames.set(key, new Intl.DisplayNames([lang], { type })); } catch { displayNames.set(key, null); }
  }
  return displayNames.get(key);
};

export const countryName = (code: string, lang = 'es') => dn(lang, 'region')?.of(code) || code;
export const currencyName = (code: string, lang = 'es') => dn(lang, 'currency')?.of(code) || code;

export const flagEmoji = (code: string) =>
  code.toUpperCase().replace(/./g, ch => String.fromCodePoint(127397 + ch.charCodeAt(0)));

/** Every ISO currency the runtime knows (falls back to the ones used by our countries). */
export const allCurrencies = (): string[] => {
  try {
    const list = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('currency');
    if (list && list.length) return list;
  } catch { /* old engine */ }
  return Array.from(new Set(Object.values(CURRENCY_OF))).sort();
};

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const matches = (query: string, ...fields: string[]) => {
  const q = normalize(query.trim());
  return !q || fields.some(f => normalize(f).includes(q));
};

// ── The user's country ──

const TZ_COUNTRY: Record<string, string> = {
  'America/Lima': 'PE', 'America/Mexico_City': 'MX', 'America/Bogota': 'CO', 'America/Argentina/Buenos_Aires': 'AR',
  'America/Santiago': 'CL', 'America/Caracas': 'VE', 'America/Guayaquil': 'EC', 'America/La_Paz': 'BO',
  'America/Guatemala': 'GT', 'America/Santo_Domingo': 'DO', 'America/Montevideo': 'UY', 'America/Asuncion': 'PY',
  'America/Costa_Rica': 'CR', 'America/Panama': 'PA', 'America/El_Salvador': 'SV', 'America/Tegucigalpa': 'HN',
  'America/Managua': 'NI', 'America/Havana': 'CU', 'America/Puerto_Rico': 'PR', 'Europe/Madrid': 'ES',
};

export const guessCountry = (): string => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (TZ_COUNTRY[tz]) return TZ_COUNTRY[tz];
  } catch { /* ignore */ }
  const region = (typeof navigator !== 'undefined' ? navigator.language : '').split('-')[1]?.toUpperCase();
  return region && CURRENCY_OF[region] ? region : 'US';
};

export const getCountry = (): string | null => {
  try { return localStorage.getItem(COUNTRY_KEY); } catch { return null; }
};

export const setCountry = (code: string) => {
  try { localStorage.setItem(COUNTRY_KEY, code.toUpperCase()); } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent(COUNTRY_EVENT, { detail: code })); } catch { /* ignore */ }
};

/** Currency to preselect anywhere money is asked: the user's country, else a guess. */
export const homeCurrency = () => currencyForCountry(getCountry() || guessCountry());

// ── Flag rendering: emoji flags don't exist on Windows; detect once. ──
let flagSupport: boolean | null = null;
export const supportsFlagEmoji = () => {
  if (flagSupport !== null) return flagSupport;
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 40;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    if (!ctx) return (flagSupport = false);
    ctx.font = '32px sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#000';
    ctx.fillText(flagEmoji('ES'), 0, 0);
    // A real flag is drawn in colour; without flag glyphs the letters come out monochrome.
    const px = ctx.getImageData(0, 0, 40, 40).data;
    let coloured = false;
    for (let i = 0; i < px.length && !coloured; i += 4) {
      if (px[i + 3] > 0 && (Math.abs(px[i] - px[i + 1]) > 40 || Math.abs(px[i + 1] - px[i + 2]) > 40)) coloured = true;
    }
    flagSupport = coloured;
  } catch { flagSupport = false; }
  return flagSupport;
};
