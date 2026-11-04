import React from 'react';
import { Check, Lock, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { useEconomy } from '@/context/EconomyContext';
import { frameItemId } from '../frames';
import { progressionStore, useProgression } from '../progressionStore';
import { RankFrameArt } from './RankFrame';
import { RANKS, rankStyle } from './tokens';

// Hole of the frame art: 73 units wide inside a 128×138 box, centred at (64, 69).
const Preview: React.FC<{ rankIndex: number | null; size: number }> = ({ rankIndex, size }) => {
  const k = size / 73;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {rankIndex !== null && (
        <div className="absolute" style={{ left: size / 2 - 64 * k, top: size / 2 - 69 * k, width: 128 * k, height: 138 * k, pointerEvents: 'none', contain: 'none' }} aria-hidden="true">
          <RankFrameArt rankIndex={rankIndex} division={2} />
        </div>
      )}
      <div className="relative z-[1] w-full h-full rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(160deg, #3f3f46, #18181b)', color: 'rgba(255,255,255,0.45)', boxShadow: rankIndex === null ? '0 0 0 2px rgba(255,255,255,0.12)' : undefined }}>
        <UserRound size={size * 0.5} />
      </div>
    </div>
  );
};

/**
 * Rank frames the user owns (inventory items, one per rank reached) and the
 * one they wear. "Sin marco" is always available and is the default.
 */
export const FrameInventory: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { inventory } = useEconomy();
  const { meta } = useProgression();
  const equipped = meta.equippedFrame ?? null;
  const owned = (i: number) => inventory.some(x => x.itemId === frameItemId(i) && x.quantity > 0);

  const pick = (i: number | null) => {
    if (i !== null && !owned(i)) {
      toast(`Se desbloquea al alcanzar ${RANKS[i].name}`);
      return;
    }
    progressionStore.updateSettings({ equippedFrame: i });
    toast.success(i === null ? 'Marco quitado' : `Marco ${RANKS[i].name} equipado`);
  };

  const size = compact ? 44 : 52;
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {[null, ...RANKS.map((_, i) => i)].map(i => {
        const on = equipped === i;
        const locked = i !== null && !owned(i);
        return (
          <button
            key={i ?? 'none'} type="button" onClick={() => pick(i)} aria-pressed={on}
            className="relative rounded-[18px] pt-4 pb-2.5 px-1 flex flex-col items-center gap-2 active:scale-[0.97] transition-transform"
            style={{
              ...(i !== null ? rankStyle(i) : {}),
              background: on ? 'rgb(var(--rank, 255 255 255) / 0.16)' : 'rgba(255,255,255,0.035)',
              boxShadow: on ? 'inset 0 0 0 1.5px rgb(var(--rank, 255 255 255) / 0.8)' : 'inset 0 0 0 1px rgba(255,255,255,0.07)',
              minHeight: 44,
            }}
          >
            <div style={{ opacity: locked ? 0.35 : 1, filter: locked ? 'grayscale(0.8)' : undefined, padding: size * 0.22 }}>
              <Preview rankIndex={i} size={size} />
            </div>
            <span className="text-[12px] font-bold leading-tight text-center" style={{ color: on ? 'rgb(var(--rank, 255 255 255))' : undefined }}>
              {i === null ? 'Sin marco' : RANKS[i].name}
            </span>
            {on && <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgb(var(--rank, 255 255 255))', color: '#0b0b10' }}><Check size={12} strokeWidth={3} /></span>}
            {locked && <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}><Lock size={11} /></span>}
          </button>
        );
      })}
    </div>
  );
};
