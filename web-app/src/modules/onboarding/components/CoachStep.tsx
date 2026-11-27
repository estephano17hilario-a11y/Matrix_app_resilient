import { useTranslation } from 'react-i18next';
import { ChatPreview } from '../../coach/ChatUI';
import { ASSISTANT_NAME_MAX, ASSISTANT_SUGGESTIONS, cleanAssistantName } from '../../coach/coachIdentity';
import { NotificationTone, TONE_DEFINITIONS } from '../../../services/notificationTonesService';

interface CoachStepProps {
  name: string;
  onName: (v: string) => void;
  tone: NotificationTone;
  onTone: (t: NotificationTone) => void;
}

// One word + one tiny phrase per personality (the long copy lives in the chat preview).
const TONE_UI: Record<NotificationTone, { emoji: string; key: string; name: string; blurb: string; ring: string }> = {
  NEUTRAL: { emoji: '🧠', key: 'calm', name: 'Calmo', blurb: 'Datos claros', ring: '#22d3ee' },
  SUPREME_MOTIVATOR: { emoji: '🌟', key: 'energy', name: 'Energía', blurb: 'Te anima', ring: '#fbbf24' },
  GOGGINS_BRUTAL: { emoji: '💀', key: 'brutal', name: 'Brutal', blurb: 'Sin excusas', ring: '#f87171' },
};

export function CoachStep({ name, onName, tone, onTone }: CoachStepProps) {
  const { t } = useTranslation();
  const clean = cleanAssistantName(name);

  return (
    <div className="space-y-4 pt-1">
      {/* 1 · name */}
      <section className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-center justify-between">
          <label htmlFor="assistant-name" className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-emerald-300">
            {t('onboarding.flow.coach.nameLabel', 'Su nombre')}
          </label>
          <span className="font-mono text-[11px] font-bold text-white/35">{name.length}/{ASSISTANT_NAME_MAX}</span>
        </div>
        <input
          id="assistant-name"
          type="text"
          maxLength={ASSISTANT_NAME_MAX}
          value={name}
          onChange={e => onName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          enterKeyHint="done"
          placeholder={t('onboarding.flow.coach.placeholder', 'Ej: Nova')}
          autoComplete="off"
          autoCorrect="off"
          className="mt-2.5 h-[54px] w-full rounded-2xl border-2 border-white/12 bg-black/50 px-4 text-[18px] font-bold text-white outline-none transition-colors placeholder:text-white/25 focus:border-emerald-400"
        />
        <div className="no-scrollbar -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-0.5">
          {ASSISTANT_SUGGESTIONS.map(sug => {
            const on = clean === sug;
            return (
              <button
                key={sug}
                type="button"
                onClick={() => onName(sug)}
                className={`h-9 flex-none touch-manipulation rounded-full border px-4 text-[13px] font-bold transition-colors duration-150 ${
                  on ? 'border-emerald-400 bg-emerald-400/15 text-emerald-200' : 'border-white/10 bg-white/[0.05] text-white/60'
                }`}
              >
                {sug}
              </button>
            );
          })}
        </div>
      </section>

      {/* 2 · personality */}
      <section>
        <div className="mb-2.5 px-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/40">
          {t('onboarding.flow.coach.toneLabel', 'Su personalidad')}
        </div>
        <div className="grid grid-cols-3 gap-2.5" role="radiogroup">
          {(Object.keys(TONE_UI) as NotificationTone[]).map(k => {
            const u = TONE_UI[k];
            const on = tone === k;
            return (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onTone(k)}
                className="flex min-h-[96px] touch-manipulation flex-col items-center justify-center gap-0.5 rounded-[20px] border-2 px-1.5 py-3 text-center transition-colors duration-150"
                style={{
                  borderColor: on ? u.ring : 'rgba(255,255,255,0.08)',
                  background: on ? `${u.ring}1f` : 'rgba(255,255,255,0.035)',
                }}
              >
                <span className="text-[26px] leading-none">{u.emoji}</span>
                <span className={`mt-1 text-[14px] font-extrabold leading-tight ${on ? 'text-white' : 'text-white/70'}`}>
                  {t(`onboarding.flow.coach.tones.${u.key}.name`, u.name)}
                </span>
                <span className="text-[11px] font-medium leading-tight text-white/45">
                  {t(`onboarding.flow.coach.tones.${u.key}.blurb`, u.blurb)}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3 · live preview */}
      <section>
        <div className="mb-2.5 px-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/40">
          {t('onboarding.flow.coach.preview', 'Así te escribirá')}
        </div>
        <ChatPreview
          name={clean || t('onboarding.flow.coach.fallbackName', 'Tu coach')}
          messages={TONE_DEFINITIONS[tone].sampleMessages.slice(0, 2)}
        />
      </section>
    </div>
  );
}
