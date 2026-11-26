import React from 'react';
import { Crown } from 'lucide-react';

/** Small "DELUXE" pill: marks locked options for free users and subscribers on public profiles. */
export const DeluxeBadge: React.FC<{ size?: 'xs' | 'sm' | 'md'; className?: string; label?: string; title?: string }> = ({
  size = 'sm', className = '', label = 'DELUXE', title,
}) => {
  const s = size === 'xs'
    ? { icon: 8, text: 'text-[8px]', pad: 'px-1.5 py-[2px]', gap: 'gap-0.5' }
    : size === 'md'
      ? { icon: 12, text: 'text-[11px]', pad: 'px-2.5 py-1', gap: 'gap-1.5' }
      : { icon: 10, text: 'text-[9px]', pad: 'px-2 py-[3px]', gap: 'gap-1' };
  return (
    <span
      title={title}
      className={`inline-flex items-center ${s.gap} ${s.pad} ${s.text} rounded-full font-black uppercase tracking-[0.14em] text-white shrink-0 align-middle ${className}`}
      style={{
        background: 'linear-gradient(110deg, #6366f1 0%, #a855f7 55%, #ec4899 100%)',
        boxShadow: '0 0 12px -2px rgba(168,85,247,0.7), inset 0 0 0 1px rgba(255,255,255,0.28)',
      }}
    >
      <Crown size={s.icon} strokeWidth={2.6} aria-hidden="true" />
      {label}
    </span>
  );
};
