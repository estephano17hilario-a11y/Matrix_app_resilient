import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Search } from 'lucide-react';
import { COUNTRY_CODES, countryName, currencyForCountry, guessCountry, matches, POPULAR } from '../../geo/countries';
import { Flag } from '../../geo/Flag';
import { cn } from '../../../utils/cn';

interface Props {
  value: string | null;
  onChange: (code: string) => void;
  lang: string;
  labels: { search: string; suggested: string; popular: string; all: string; empty: string };
}

/** Searchable country list: suggested (time zone), popular, then every country A–Z. */
export const CountryPicker = ({ value, onChange, lang, labels }: Props) => {
  const [q, setQ] = useState('');
  const uiLang = lang.startsWith('en') ? 'en' : 'es';
  const guess = useMemo(guessCountry, []);
  const sorted = useMemo(
    () => [...COUNTRY_CODES].sort((a, b) => countryName(a, uiLang).localeCompare(countryName(b, uiLang), uiLang)),
    [uiLang],
  );
  const hits = q.trim() ? sorted.filter(c => matches(q, countryName(c, uiLang), c, currencyForCountry(c))) : null;

  const Row = ({ code, i }: { code: string; i: number }) => {
    const on = value === code;
    return (
      <motion.button
        type="button"
        onClick={() => onChange(code)}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: Math.min(i, 10) * 0.025 }}
        aria-pressed={on}
        className={cn('flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors',
          on ? 'bg-violet-500/20 ring-2 ring-violet-400' : 'active:bg-white/[0.06]')}
      >
        <Flag code={code} size={24} />
        <span className="min-w-0 flex-1 truncate text-[15.5px] font-bold">{countryName(code, uiLang)}</span>
        <span className="shrink-0 rounded-full bg-white/[0.07] px-2 py-0.5 text-[11px] font-black tracking-wide text-white/50">{currencyForCountry(code)}</span>
        <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors',
          on ? 'border-violet-300 bg-violet-500' : 'border-white/15')}>
          {on && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3.5} />}
        </span>
      </motion.button>
    );
  };

  const Section = ({ title, codes, offset = 0 }: { title: string; codes: string[]; offset?: number }) => (
    <div className="mb-2">
      <div className="px-3 pb-1 pt-2 text-[10.5px] font-black uppercase tracking-[0.18em] text-white/35">{title}</div>
      {codes.map((c, i) => <Row key={`${title}-${c}`} code={c} i={i + offset} />)}
    </div>
  );

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/35" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder={labels.search}
          autoComplete="off"
          className="h-[52px] w-full rounded-2xl border-2 border-white/10 bg-white/[0.045] pl-12 pr-4 text-[16px] font-semibold text-white outline-none placeholder:text-white/30 focus:border-violet-400/80"
        />
      </div>
      <div className="mt-3 max-h-[42vh] overflow-y-auto overscroll-contain rounded-[22px] border-2 border-white/[0.07] bg-white/[0.025] p-1.5 no-scrollbar">
        {hits ? (
          hits.length ? hits.map((c, i) => <Row key={c} code={c} i={i} />)
            : <p className="px-4 py-6 text-center text-[13.5px] font-semibold text-white/40">{labels.empty}</p>
        ) : (
          <>
            <Section title={labels.suggested} codes={[guess]} />
            <Section title={labels.popular} codes={POPULAR.filter(c => c !== guess)} offset={1} />
            <Section title={labels.all} codes={sorted} offset={12} />
          </>
        )}
      </div>
    </div>
  );
};
