import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useEconomy } from '@/context/EconomyContext';
import { frameItemId } from '../frames';
import { useProgression } from '../progressionStore';
import { RANKS } from './tokens';

/**
 * Puts the frame of every rank the user has reached (now or at any point of
 * the ELO history) in the inventory. Frames are kept after a demotion.
 */
export const FrameUnlocker: React.FC = () => {
  const { ready, summary } = useProgression();
  const { inventory, grantItem } = useEconomy();
  const granting = useRef(new Set<string>());
  const highest = summary.steps.reduce((m, s) => Math.max(m, s.rankIndexAfter), summary.rankIndex);

  // One frame per pass: grantItem builds on the inventory it was created with,
  // so the next missing frame is granted once the inventory has updated.
  useEffect(() => {
    if (!ready) return;
    const missing = Array.from({ length: highest + 1 }, (_, i) => i)
      .find(i => !granting.current.has(frameItemId(i)) && !inventory.some(x => x.itemId === frameItemId(i)));
    if (missing === undefined) return;
    const id = frameItemId(missing);
    granting.current.add(id);
    grantItem(id, 1).then(ok => {
      // `false` may still have saved it locally (server sync failed); the inventory
      // check above stops a second grant, so it is safe to allow a retry later.
      if (!ok) granting.current.delete(id);
      else if (missing > 0) toast.success(`Nuevo marco desbloqueado: ${RANKS[missing].name}. Equípalo desde tu inventario.`, { duration: 5000 });
    });
  }, [ready, highest, inventory, grantItem]);

  return null;
};
