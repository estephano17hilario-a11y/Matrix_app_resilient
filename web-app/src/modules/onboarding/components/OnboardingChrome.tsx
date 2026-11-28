import { ReactNode } from 'react';
import { ArrowRight, Check, ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ChunkyButton } from '../../auth/components/AuthUI';

// Shared chrome for every onboarding step after the character select:
//  · TopBar    – back button + segmented progress (always clear of the status bar)
//  · StepShell – icon chip, title and a ONE-line explanation, then a scroll area
//  · StepFooter – one big, thumb-sized action that rests above the gesture bar
// Sizes use the --sat / --sab / --action-bottom insets (see index.css), so it
// reads the same on a notched phone, a small phone with 3-button nav and a tablet.

export const TOTAL_STEPS = 5;

/** Space a scroll area must leave at the bottom so the last card clears the footer. */
export const FOOTER_CLEARANCE = 'calc(var(--action-bottom) + 14px + 68px + 28px)';

export function TopBar({ index, onBack }: { index: number; onBack?: () => void }) {
  const { t } = useTranslation();
  return (
    // Inline pointer-events: the global `.pointer-events-none` class adds `contain: strict`, which collapses this row's height.
    <div
      className="absolute inset-x-0 top-0 z-[60] flex items-center gap-3 px-4 pt-[calc(var(--sat)+10px)]"
      style={{ pointerEvents: 'none' }}
    >
      <div className="h-11 w-11 flex-none">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label={t('common.back', 'Atrás')}
            style={{ pointerEvents: 'auto' }}
            className="grid h-11 w-11 touch-manipulation place-items-center rounded-full bg-white/[0.07] text-white/70 active:scale-90"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
      </div>
      <div
        className="flex flex-1 gap-1.5"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={TOTAL_STEPS}
        aria-valuenow={index + 1}
      >
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div key={i} className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/[0.1]">
            <div
              className="absolute inset-0 origin-left rounded-full bg-gradient-to-r from-[#a78bfa] to-[#f472b6] transition-transform duration-300 ease-out"
              style={{ transform: `scaleX(${i <= index ? 1 : 0})` }}
            />
          </div>
        ))}
      </div>
      <span className="w-11 flex-none text-right text-[12px] font-black tabular-nums text-white/45">
        {index + 1}/{TOTAL_STEPS}
      </span>
    </div>
  );
}

export function StepShell({
  icon,
  tone,
  title,
  sub,
  children,
}: {
  icon: ReactNode;
  /** Tailwind classes that tint the icon chip, e.g. "bg-cyan-500/15 text-cyan-300". */
  tone: string;
  title: string;
  sub: string;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col pt-[calc(var(--sat)+64px)]">
      <div className="mx-auto flex w-full max-w-xl flex-none items-center gap-3.5 px-5 pb-3 pt-1">
        <div className={`grid h-12 w-12 flex-none place-items-center rounded-2xl ${tone}`}>{icon}</div>
        <div className="min-w-0">
          <h1 className="text-[24px] font-black leading-tight tracking-tight text-white sm:text-[28px]">{title}</h1>
          <p className="mt-0.5 text-[13.5px] font-medium leading-snug text-white/55">{sub}</p>
        </div>
      </div>
      <div
        className="no-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"
        style={{ paddingBottom: FOOTER_CLEARANCE }}
      >
        <div className="mx-auto w-full max-w-xl px-4">{children}</div>
      </div>
    </div>
  );
}

export function StepFooter({
  label,
  disabled,
  final,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  final?: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className="absolute inset-x-0 bottom-0 z-[70] px-5 pt-8"
      style={{
        paddingBottom: 'calc(var(--action-bottom) + 14px)',
        background: 'linear-gradient(to top, #000 0%, rgba(0,0,0,0.92) 55%, rgba(0,0,0,0) 100%)',
      }}
    >
      <div className="mx-auto w-full max-w-md">
        <ChunkyButton
          type="button"
          size="xl"
          variant={final ? 'success' : 'primary'}
          disabled={disabled}
          shine={!disabled}
          onClick={onClick}
        >
          <span>{label}</span>
          {final ? <Check className="h-6 w-6" strokeWidth={3.5} /> : <ArrowRight className="h-6 w-6" strokeWidth={3} />}
        </ChunkyButton>
      </div>
    </div>
  );
}
