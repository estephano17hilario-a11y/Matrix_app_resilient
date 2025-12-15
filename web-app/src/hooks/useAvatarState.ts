import { useMemo } from 'react';
import { Zap, Activity, AlertTriangle, LucideIcon } from 'lucide-react';

export type AvatarMode = 'PRIME' | 'NEUTRAL' | 'DECAYED';

interface AvatarState {
  mode: AvatarMode;
  color: string;      // Main color for ring/glow
  shadowColor: string; // Color for box-shadow
  Icon: LucideIcon;   // Placeholder icon
}

/**
 * useAvatarState
 * Determines the visual state of the avatar based on HP.
 * 
 * @param hp - Current Health Points (0-100)
 * @returns AvatarState object with mode, colors, and icon asset.
 */
export const useAvatarState = (hp: number): AvatarState => {
  return useMemo(() => {
    // Ensure HP is clamped between 0 and 100
    const clampedHp = Math.max(0, Math.min(100, hp));

    if (clampedHp > 80) {
      return {
        mode: 'PRIME',
        // Cyan-400 for that Electric/God mode feel
        color: '#22d3ee', 
        // Golden/Cyan Aura mix (using Cyan for consistency in ring)
        shadowColor: 'rgba(34, 211, 238, 0.6)',
        Icon: Zap, // Symbol of Power/Energy
      };
    } else if (clampedHp >= 30) {
      return {
        mode: 'NEUTRAL',
        // Emerald-400 for Healthy/Standard state
        color: '#34d399', 
        shadowColor: 'rgba(52, 211, 153, 0.4)',
        Icon: Activity, // Stable heartbeat
      };
    } else {
      return {
        mode: 'DECAYED',
        // Rose-500 for Critical/Danger
        color: '#f43f5e', 
        shadowColor: 'rgba(244, 63, 94, 0.5)',
        Icon: AlertTriangle, // Warning/Glitch
      };
    }
  }, [hp]);
};
