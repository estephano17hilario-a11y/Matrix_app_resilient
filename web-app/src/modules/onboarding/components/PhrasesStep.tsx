import { ReactNode } from 'react';
import { ShieldAlert, Volume2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PhrasesStepProps {
  anti: string;
  onAnti: (v: string) => void;
  splash: string;
  onSplash: (v: string) => void;
}

const ANTI_SUGGESTIONS = ['¿Vas a dejar que te ganen hoy?', '5 minutos. Solo empieza.', 'Tu yo del futuro te mira.'];
const SPLASH_SUGGESTIONS = ['Sin Excusas', 'Más fuerte hoy', 'Hazlo ahora', 'Un día más'];

function PhraseCard({
  icon, accent, title, why, value, max, placeholder, suggestions, onChange,
}: {
  icon: ReactNode;
  accent: string;
  title: string;
  why: string;
  value: string;
  max: number;
  placeholder: string;
  suggestions: string[];
  onChange: (v: string) => void;
}) {
  return (
    <section className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 flex-none place-items-center rounded-xl" style={{ background: `${accent}26`, color: accent }}>{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[15px] font-extrabold leading-tight text-white">{title}</h2>
            <span className="font-mono text-[11px] font-bold text-white/35">{value.length}/{max}</span>
          </div>
          <p className="mt-0.5 text-[12.5px] font-medium leading-snug text-white/50">{why}</p>
        </div>
      </div>
      <input
        type="text"
        maxLength={max}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        enterKeyHint="done"
        placeholder={placeholder}
        autoComplete="off"
        className="mt-3 h-[52px] w-full rounded-2xl border-2 border-white/12 bg-black/50 px-4 text-[16px] font-semibold text-white outline-none transition-colors placeholder:text-white/25"
        style={{ caretColor: accent }}
        onFocus={e => { e.currentTarget.style.borderColor = accent; }}
        onBlur={e => { e.currentTarget.style.borderColor = ''; }}
      />
      <div className="no-scrollbar -mx-1 mt-2.5 flex gap-2 overflow-x-auto px-1 pb-0.5">
        {suggestions.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s.slice(0, max))}
            className={`h-9 flex-none touch-manipulation whitespace-nowrap rounded-full border px-3.5 text-[12.5px] font-bold transition-colors duration-150 ${
              value === s ? 'text-white' : 'border-white/10 bg-white/[0.05] text-white/55'
            }`}
            style={value === s ? { borderColor: accent, background: `${accent}22` } : undefined}
          >
            {s}
          </button>
        ))}
      </div>
    </section>
  );
}

export function PhrasesStep({ anti, onAnti, splash, onSplash }: PhrasesStepProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3.5 pt-1">
      <PhraseCard
        icon={<ShieldAlert size={20} />}
        accent="#fbbf24"
        title={t('onboarding.flow.phrases.antiTitle', 'Tu frase de choque')}
        why={t('onboarding.flow.phrases.antiWhy', 'Te la mostramos cuando estés procrastinando o lleves días sin entrar.')}
        value={anti}
        max={50}
        placeholder={t('onboarding.flow.phrases.antiPlaceholder', 'Ej: ¿Vas a dejar que te ganen hoy?')}
        suggestions={ANTI_SUGGESTIONS}
        onChange={onAnti}
      />
      <PhraseCard
        icon={<Volume2 size={20} />}
        accent="#22d3ee"
        title={t('onboarding.flow.phrases.splashTitle', 'Tu lema de inicio')}
        why={t('onboarding.flow.phrases.splashWhy', 'Aparece bajo LUX cada vez que abres la app.')}
        value={splash}
        max={20}
        placeholder={t('onboarding.flow.phrases.splashPlaceholder', 'Ej: Sin Excusas')}
        suggestions={SPLASH_SUGGESTIONS}
        onChange={onSplash}
      />

      {/* What the splash will look like */}
      <div className="relative flex flex-col items-center justify-center gap-1.5 overflow-hidden rounded-[22px] border border-white/10 bg-black py-5">
        <span className="absolute left-3.5 top-2.5 font-mono text-[9px] font-bold uppercase tracking-widest text-white/30">
          {t('onboarding.flow.phrases.preview', 'Vista previa')}
        </span>
        <h2 className="mr-[-0.45em] pt-2 text-[26px] font-extralight tracking-[0.45em] text-white/90">LUX</h2>
        <div className="h-px w-20 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
        <p className="max-w-full truncate px-4 font-mono text-[12.5px] font-semibold tracking-wider text-cyan-300">
          {splash.trim() || 'Sin Excusas'}
        </p>
      </div>
    </div>
  );
}
