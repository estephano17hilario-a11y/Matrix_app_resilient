import { memo, useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { COUNTRY_CODES, countryName, guessCountry, matches, POPULAR } from '../../geo/countries';
import { Flag } from '../../geo/Flag';
import { cn } from '../../../utils/cn';

interface Props {
  value: string | null;
  onChange: (code: string) => void;
  lang: string;
  labels: { search: string; suggested: string; popular: string; all: string; empty: string };
}

// Rows live at module level and are memoised. They used to be declared inside the picker, which made
// React treat every row as a NEW component on each render: picking a country or typing in the search
// unmounted and remounted all ~200 rows (and replayed their fade-in) = flicker and lag.
const Row = memo(({ code, name, on, onPick }: { code: string; name: string; on: boolean; onPick: (code: string) => void }) => (
  <button
    type="button"
    onClick={() => onPick(code)}
    aria-pressed={on}
    className={cn('flex w-full touch-manipulation items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors duration-100',
      on ? 'bg-violet-500/20 ring-2 ring-violet-400' : 'active:bg-white/[0.06]')}
  >
    <Flag code={code} size={24} />
    <span className="min-w-0 flex-1 truncate text-[15.5px] font-bold">{name}</span>
    <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors duration-100',
      on ? 'border-violet-300 bg-violet-500' : 'border-white/15')}>
      {on && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3.5} />}
    </span>
  </button>
));
Row.displayName = 'CountryRow';

const Section = memo(({ title, rows, value, onPick }: { title: string; rows: { code: string; name: string }[]; value: string | null; onPick: (code: string) => void }) => (
  <div className="mb-2">
    <div className="px-3 pb-1 pt-2 text-[10.5px] font-black uppercase tracking-[0.18em] text-white/35">{title}</div>
    {rows.map(r => <Row key={r.code} code={r.code} name={r.name} on={value === r.code} onPick={onPick} />)}
  </div>
));
Section.displayName = 'CountrySection';

/** Searchable country list: suggested (time zone), popular, then every country A–Z. Names only. */
export const CountryPicker = ({ value, onChange, lang, labels }: Props) => {
  const [q, setQ] = useState('');
  const uiLang = lang.startsWith('en') ? 'en' : 'es';
  const guess = useMemo(guessCountry, []);
  const all = useMemo(
    () => COUNTRY_CODES.map(code => ({ code, name: countryName(code, uiLang) })).sort((a, b) => a.name.localeCompare(b.name, uiLang)),
    [uiLang],
  );
  const byCode = useMemo(() => new Map(all.map(r => [r.code, r])), [all]);
  const suggested = useMemo(() => [byCode.get(guess)].filter(Boolean) as { code: string; name: string }[], [byCode, guess]);
  const popular = useMemo(() => POPULAR.filter(c => c !== guess).map(c => byCode.get(c)).filter(Boolean) as { code: string; name: string }[], [byCode, guess]);
  const hits = useMemo(() => (q.trim() ? all.filter(r => matches(q, r.name, r.code)) : null), [q, all]);

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
          hits.length ? hits.map(r => <Row key={r.code} code={r.code} name={r.name} on={value === r.code} onPick={onChange} />)
            : <p className="px-4 py-6 text-center text-[13.5px] font-semibold text-white/40">{labels.empty}</p>
        ) : (
          <>
            <Section title={labels.suggested} rows={suggested} value={value} onPick={onChange} />
            <Section title={labels.popular} rows={popular} value={value} onPick={onChange} />
            <Section title={labels.all} rows={all} value={value} onPick={onChange} />
          </>
        )}
      </div>
    </div>
  );
};
