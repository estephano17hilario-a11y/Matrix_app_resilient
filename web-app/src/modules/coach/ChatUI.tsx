// Chat-app look for coach messages: default "no photo" avatar, chat header, incoming bubbles
// and the heads-up card shown inside the app.

import { memo, useId, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { CheckCheck } from 'lucide-react';

/** Default profile picture of chat apps when the contact has no photo. */
export const DefaultAvatar = memo(({ size = 44 }: { size?: number }) => {
  const clip = `lux-av-${useId().replace(/:/g, '')}`;
  return (
  <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden style={{ flex: 'none', borderRadius: '50%', display: 'block' }}>
    <defs>
      <clipPath id={clip}><circle cx="50" cy="50" r="50" /></clipPath>
    </defs>
    <g clipPath={`url(#${clip})`}>
      <rect width="100" height="100" fill="#6a7b85" />
      <circle cx="50" cy="39" r="18" fill="#cfd8dc" />
      <ellipse cx="50" cy="95" rx="34" ry="33" fill="#cfd8dc" />
    </g>
  </svg>
  );
});
DefaultAvatar.displayName = 'DefaultAvatar';

const clock = (d = new Date()) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/** Incoming bubble with a tail, like a chat app. */
export const IncomingBubble = ({ children, time, first, delay = 0 }: { children: ReactNode; time?: string; first?: boolean; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 8, scale: 0.96 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ delay, type: 'spring', stiffness: 420, damping: 30 }}
    style={{ transformOrigin: '0% 100%' }}
    className="relative max-w-[86%] self-start"
  >
    {first && (
      <svg aria-hidden viewBox="0 0 8 13" width="8" height="13" className="absolute -left-[7px] top-0" style={{ color: '#202c33' }}>
        <path fill="currentColor" d="M8 0H0l8 13z" />
      </svg>
    )}
    <div className={`bg-[#202c33] text-[#e9edef] text-[14.5px] leading-[1.38] px-2.5 pt-1.5 pb-1 shadow-[0_1px_0.5px_rgba(0,0,0,0.25)] ${first ? 'rounded-[10px] rounded-tl-none' : 'rounded-[10px]'}`}>
      <span className="whitespace-pre-wrap break-words">{children}</span>
      <span className="float-right ml-2 mt-1.5 -mb-0.5 text-[11px] text-[#8696a0] leading-none">{time ?? clock()}</span>
    </div>
  </motion.div>
);

/** A tiny chat window: header with the coach + the given bubbles. */
export const ChatPreview = ({ name, messages, typing }: { name: string; messages: string[]; typing?: boolean }) => (
  <div className="w-full overflow-hidden rounded-[22px] border border-white/10 bg-[#0b141a] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)]">
    <div className="flex items-center gap-3 bg-[#202c33] px-3.5 py-2.5">
      <DefaultAvatar size={38} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15.5px] font-semibold text-[#e9edef]">{name}</div>
        <div className="text-[12px] text-[#8696a0]">{typing ? 'escribiendo…' : 'en línea'}</div>
      </div>
    </div>
    <div
      className="flex flex-col gap-1.5 px-3 py-3"
      style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)', backgroundSize: '16px 16px' }}
    >
      <div className="mx-auto mb-1 rounded-md bg-[#182229] px-2.5 py-1 text-[11px] font-medium text-[#8696a0]">HOY</div>
      {messages.map((m, i) => (
        <IncomingBubble key={`${i}-${m}`} first={i === 0} delay={0.08 * i} time={['09:00', '13:30', '19:30'][i % 3]}>{m}</IncomingBubble>
      ))}
    </div>
  </div>
);

/** Heads-up card shown inside the app when the coach writes. */
export const CoachHeadsUp = ({ name, body, onOpen, onDismiss }: { name: string; body: string; onOpen?: () => void; onDismiss: () => void }) => (
  <motion.div
    role="status"
    aria-live="polite"
    initial={{ y: -120, opacity: 0, scale: 0.96 }}
    animate={{ y: 0, opacity: 1, scale: 1 }}
    exit={{ y: -120, opacity: 0, transition: { duration: 0.22, ease: 'easeIn' } }}
    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
    drag="y"
    dragConstraints={{ top: 0, bottom: 0 }}
    dragElastic={{ top: 0.6, bottom: 0.1 }}
    onDragEnd={(_, info) => { if (info.offset.y < -30 || info.velocity.y < -300) onDismiss(); }}
    onClick={onOpen}
    className="pointer-events-auto w-full max-w-[460px] cursor-pointer overflow-hidden rounded-[22px] border border-white/10 bg-[#1f2c34]/[0.98] shadow-[0_22px_60px_-18px_rgba(0,0,0,0.95)]"
  >
    <div className="flex items-start gap-3 px-3.5 pt-3 pb-2.5">
      <div className="relative">
        <DefaultAvatar size={46} />
        <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#1f2c34] bg-[#25d366]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-[15.5px] font-bold text-[#e9edef]">{name}</span>
          <span className="ml-auto shrink-0 text-[11.5px] font-semibold text-[#25d366]">{clock()}</span>
        </div>
        <p className="mt-0.5 line-clamp-3 text-[14px] leading-snug text-[#d1d7db]">{body}</p>
      </div>
    </div>
    <div className="flex items-center justify-between border-t border-white/[0.06] px-3.5 py-2 text-[12.5px] font-bold">
      <span className="flex items-center gap-1 text-[#8696a0]"><CheckCheck size={15} className="text-[#53bdeb]" /> Lux</span>
      <button type="button" onClick={e => { e.stopPropagation(); onDismiss(); }} className="rounded-full px-3 py-1 text-[#25d366] active:bg-white/5">
        Marcar como leído
      </button>
    </div>
  </motion.div>
);
