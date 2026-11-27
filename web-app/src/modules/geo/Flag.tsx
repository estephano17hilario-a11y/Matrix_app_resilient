import { memo } from 'react';
import { flagEmoji, supportsFlagEmoji } from './countries';

/** Country flag: emoji where the platform has flag glyphs, a neat ISO badge elsewhere (Windows). */
export const Flag = memo(({ code, size = 26 }: { code: string; size?: number }) => {
  if (supportsFlagEmoji()) {
    return <span aria-hidden style={{ fontSize: size, lineHeight: 1, display: 'inline-block' }}>{flagEmoji(code)}</span>;
  }
  return (
    <span aria-hidden
      className="inline-grid place-items-center rounded-md bg-gradient-to-br from-white/25 to-white/5 font-black text-white ring-1 ring-white/20"
      style={{ width: size * 1.35, height: size, fontSize: size * 0.42, letterSpacing: '0.04em' }}>
      {code.toUpperCase()}
    </span>
  );
});
Flag.displayName = 'Flag';
